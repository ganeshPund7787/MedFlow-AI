import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import LabResult from "../models/labResults";
import invoice from "../models/invoice";
import { getIO } from "./socket";
import { inngest } from "../inngest/client";

const genAI = process.env.GEMINI_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_KEY)
  : null;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/** Avoid exposing raw Google API errors (e.g. leaked key) in patient-facing text. */
export function toUserFacingGeminiError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/leaked|403|invalid.*api.*key|permission denied/i.test(msg)) {
    return "Gemini API key is invalid or revoked. Set a new GEMINI_KEY in backend/.env (see .env.example) and restart the server.";
  }
  if (/not configured|GEMINI_KEY/i.test(msg)) {
    return "Gemini is not configured on this server (GEMINI_KEY missing).";
  }
  return "AI analysis is temporarily unavailable. Please try again later.";
}

export async function analyzeXrayWithGemini(
  imageUrl: string,
  bodyPart: string,
): Promise<string> {
  if (!genAI) {
    throw new Error("GEMINI_KEY is not configured on the server.");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download scan image (HTTP ${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const mimeType = (contentType.split(";")[0] ?? "image/jpeg").trim();
  const imageBase64 = Buffer.from(await response.arrayBuffer()).toString(
    "base64",
  );

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = `You are an expert AI radiologist. Analyze this ${bodyPart} x-ray image. Provide a structured response:
1. Key Findings
2. Potential Abnormalities
3. Summary.
Keep it clinical, concise, and end with a disclaimer.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    },
  ]);

  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned an empty analysis.");
  }
  return text;
}

export function emitLabResultSocket(
  event: "lab_result_updated" | "lab_result_added",
  payload?: unknown,
) {
  try {
    const io = getIO();
    io.emit(event, payload);
  } catch {
    // Socket may not be initialized during tests
  }
}

/** Persist AI analysis and notify connected clients. */
export async function completeXrayLabResult(
  labResultId: string,
  imageUrl: string,
  bodyPart: string,
) {
  let aiAnalysis: string;
  try {
    aiAnalysis = await analyzeXrayWithGemini(imageUrl, bodyPart || "region");
  } catch (error) {
    aiAnalysis = `AI analysis could not be completed. ${toUserFacingGeminiError(error)}`;
    console.error("[xray] Gemini analysis failed:", error);
  }

  const updated = await LabResult.findByIdAndUpdate(
    labResultId,
    { aiAnalysis, status: "analyzed" },
    { new: true },
  ).lean();

  if (updated) {
    emitLabResultSocket("lab_result_updated", updated);
  }

  return updated;
}

/** Add radiology line item to draft invoice (same logic as Inngest billing job). */
export async function addXrayBillingCharge(
  patientId: string | mongoose.Types.ObjectId,
  bodyPart: string,
) {
  const pid = typeof patientId === "string" ? patientId : patientId.toString();
  const description = `Radiology: ${bodyPart || "General"} X-Ray Analysis`;
  const priceInCents = 15000;

  let inv = await invoice.findOne({ patientId: pid, status: "draft" });
  if (!inv) {
    inv = new invoice({ patientId: pid, items: [], totalAmount: 0 });
  }

  inv.items.push({
    description,
    quantity: 1,
    unitPrice: priceInCents,
    totalPrice: priceInCents,
  });
  inv.totalAmount += priceInCents;
  await inv.save();
  return inv;
}

/** Run analysis + billing without Inngest (dev / when Inngest dev server is offline). */
export async function runInlineXrayPipeline(options: {
  labResultId: string;
  imageUrl: string;
  bodyPart: string;
  patientId: string | mongoose.Types.ObjectId;
}) {
  const { labResultId, imageUrl, bodyPart, patientId } = options;
  await completeXrayLabResult(labResultId, imageUrl, bodyPart);
  await addXrayBillingCharge(patientId, bodyPart);
}

/** Prefer Inngest; fall back to inline processing so uploads never return 500. */
export function scheduleXrayPipeline(options: {
  labResultId: string;
  imageUrl: string;
  bodyPart: string;
  patientId: string | mongoose.Types.ObjectId;
}) {
  const { labResultId, imageUrl, bodyPart, patientId } = options;

  void (async () => {
    try {
      await inngest.send({
        name: "labResult/created",
        data: { labResultId, imageUrl, bodyPart },
      });
      await inngest.send({
        name: "billing/charge.added",
        data: {
          patientId,
          description: `Radiology: ${bodyPart || "General"} X-Ray Analysis`,
          priceInCents: 15000,
        },
      });
    } catch (inngestError) {
      console.warn(
        "[xray] Inngest unavailable — running inline AI analysis & billing",
        inngestError,
      );
      try {
        await runInlineXrayPipeline(options);
      } catch (inlineError) {
        console.error("[xray] Inline pipeline failed:", inlineError);
      }
    }
  })();
}
