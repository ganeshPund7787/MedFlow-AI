import mongoose from "mongoose";
import Appointment from "../models/appointment";
import Invoice from "../models/invoice";
import { runGeminiJsonPrompt } from "./gemini";
import { nlSearchResponseSchema } from "./aiSchemas";

type NlSearchPlan = {
  intent: string;
  collection: "user" | "invoice" | "appointment";
  mongoFilter: Record<string, unknown>;
  summary: string;
};

const fallbackPlan: NlSearchPlan = {
  intent: "unknown",
  collection: "user",
  mongoFilter: { role: "patient" },
  summary: "Fallback search applied due to AI parsing issue.",
};

function sanitizeFilter(filter: Record<string, unknown>) {
  const blockedKeys = ["$where", "$function", "$accumulator", "$expr"];
  const payload = JSON.stringify(filter);
  for (const key of blockedKeys) {
    if (payload.includes(key)) {
      throw new Error(`Unsafe operator detected: ${key}`);
    }
  }
  return filter;
}

export async function executeNaturalLanguageSearch(query: string, limit: number) {
  const aiPayload = await runGeminiJsonPrompt<NlSearchPlan>({
    prompt: `Convert this medical admin search text to MongoDB filter JSON.
Allowed collections: user, invoice, appointment.
Return strict JSON with: intent, collection, mongoFilter, summary.
Only use safe operators: $gte, $lte, $in, $eq, $ne, $and, $or.
Query: "${query}"`,
    fallback: fallbackPlan,
  });

  const parsed = nlSearchResponseSchema.safeParse(aiPayload);
  const plan = parsed.success ? parsed.data : fallbackPlan;
  const safeFilter = sanitizeFilter(plan.mongoFilter);

  if (plan.collection === "invoice") {
    const results = await Invoice.find(safeFilter).sort({ createdAt: -1 }).limit(limit).lean();
    return { ...plan, results };
  }

  if (plan.collection === "appointment") {
    const results = await Appointment.find(safeFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return { ...plan, results };
  }

  const userCollection = mongoose.connection.collection("user");
  const results = await userCollection
    .find(safeFilter, { projection: { password: 0, headers: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return { ...plan, results };
}
