import mongoose from "mongoose";
import Appointment from "../models/appointment";
import Vitals from "../models/vitals";
import Invoice from "../models/invoice";
import { runGeminiJsonPrompt } from "./gemini";
import { clinicalAssistantResponseSchema } from "./aiSchemas";

type ClinicalAssistantResult = {
  patientSummary: string;
  medicalHistorySummary: string;
  medicationSummary: string;
  missedFollowUps: string[];
  abnormalTrends: string[];
  riskAlerts: string[];
};

function fallbackClinicalSummary(): ClinicalAssistantResult {
  return {
    patientSummary:
      "Clinical summary is temporarily unavailable. Please review patient profile data.",
    medicalHistorySummary: "No AI summary available at this moment.",
    medicationSummary: "No medication insights available currently.",
    missedFollowUps: [],
    abnormalTrends: [],
    riskAlerts: ["AI assistant unavailable. Use manual clinical review."],
  };
}

export async function generateClinicalAssistant(patientId: string) {
  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient id.");
  }
  const userCollection = mongoose.connection.collection("user");
  const objectId = new mongoose.Types.ObjectId(patientId);

  const [patient, recentAppointments, recentVitals, invoices] =
    await Promise.all([
      userCollection.findOne({ _id: objectId, role: "patient" }),
      Appointment.find({ patientId: objectId })
        .sort({ date: -1 })
        .limit(20)
        .lean(),
      Vitals.find({ patientId: objectId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Invoice.find({ patientId: patientId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

  // ADD THESE LOGS:
  console.log("[ClinicalAI] patientId received:", patientId);
  console.log("[ClinicalAI] objectId created:", objectId);
  console.log("[ClinicalAI] patient found:", !!patient, patient?._id);
  console.log("[ClinicalAI] appts:", recentAppointments.length);
  console.log("[ClinicalAI] vitals:", recentVitals.length);
  console.log("[ClinicalAI] invoices:", invoices.length);
  if (!patient) {
    throw new Error("Patient not found.");
  }

  const now = new Date();
  const missedFollowUps = recentAppointments
    .filter(
      (appt) =>
        ["scheduled", "confirmed"].includes(appt.status) &&
        new Date(appt.date) < now,
    )
    .slice(0, 5)
    .map((appt) => `${new Date(appt.date).toDateString()} at ${appt.time}`);

  const aiPayload = await runGeminiJsonPrompt<ClinicalAssistantResult>({
    prompt: `You are MedFlow AI Clinical Assistant.
Return strict JSON with keys:
patientSummary, medicalHistorySummary, medicationSummary, missedFollowUps, abnormalTrends, riskAlerts.
Use concise and clinically safe language.

Patient:
${JSON.stringify(
  {
    id: patient._id?.toString(),
    name: patient.name,
    age: patient.age,
    bloodgroup: patient.bloodgroup,
    status: patient.status,
    medicalHistory: patient.medicalHistory,
    admissionReason: patient.admissionReason,
  },
  null,
  2,
)}

Recent appointments:
${JSON.stringify(recentAppointments, null, 2)}

Recent vitals:
${JSON.stringify(recentVitals, null, 2)}

Recent invoices:
${JSON.stringify(invoices, null, 2)}

Detected missed follow-ups:
${JSON.stringify(missedFollowUps, null, 2)}
`,
    fallback: fallbackClinicalSummary(),
  });

  const parsed = clinicalAssistantResponseSchema.safeParse(aiPayload);
  if (!parsed.success) {
    return fallbackClinicalSummary();
  }

  if (!parsed.data.missedFollowUps.length && missedFollowUps.length) {
    parsed.data.missedFollowUps = missedFollowUps;
  }
  return parsed.data;
}
