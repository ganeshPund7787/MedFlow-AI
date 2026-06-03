import mongoose from "mongoose";
import Appointment from "../models/appointment";
import Payment from "../models/payment";
import { runGeminiJsonPrompt } from "./gemini";
import { operationsAnalystResponseSchema } from "./aiSchemas";

type OperationsAnalystResult = {
  executiveSummary: string;
  forecasts: string[];
  bottlenecks: string[];
  recommendations: string[];
  kpis: {
    revenueTrend: string;
    bedOccupancy: string;
    appointmentTrend: string;
    departmentPerformance: string;
    staffWorkload: string;
  };
};

function fallbackOpsSummary(): OperationsAnalystResult {
  return {
    executiveSummary:
      "AI operations analyst is temporarily unavailable. Displaying baseline metrics only.",
    forecasts: [],
    bottlenecks: [],
    recommendations: ["Review dashboard trendlines and staffing plans manually."],
    kpis: {
      revenueTrend: "Unavailable",
      bedOccupancy: "Unavailable",
      appointmentTrend: "Unavailable",
      departmentPerformance: "Unavailable",
      staffWorkload: "Unavailable",
    },
  };
}

export async function generateOperationsAnalyst(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const userCollection = mongoose.connection.collection("user");

  const [patients, appointments, payments, departments, doctorWorkload, nurseWorkload] =
    await Promise.all([
      userCollection.countDocuments({ role: "patient", status: "admitted" }),
      Appointment.find({ createdAt: { $gte: since } }).lean(),
      Payment.find({ createdAt: { $gte: since }, status: "succeeded" }).lean(),
      userCollection
        .aggregate([
          { $match: { role: { $in: ["doctor", "nurse"] } } },
          { $group: { _id: "$department", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ])
        .toArray(),
      Appointment.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$doctorId", appointments: { $sum: 1 } } },
        { $sort: { appointments: -1 } },
        { $limit: 10 },
      ]),
      Appointment.aggregate([
        { $match: { createdAt: { $gte: since }, nurseId: { $exists: true } } },
        { $group: { _id: "$nurseId", assignments: { $sum: 1 } } },
        { $sort: { assignments: -1 } },
        { $limit: 10 },
      ]),
    ]);

  const totalRevenue = payments.reduce((sum, item) => sum + (item.amount || 0), 0);
  const completedAppointments = appointments.filter(
    (item) => item.status === "completed",
  ).length;
  const totalAppointments = appointments.length;
  const bedCapacity = 200;
  const bedOccupancyPercent = Math.min(100, Math.round((patients / bedCapacity) * 100));

  const aiPayload = await runGeminiJsonPrompt<OperationsAnalystResult>({
    prompt: `You are MedFlow AI Hospital Operations Analyst.
Return strict JSON with keys: executiveSummary, forecasts, bottlenecks, recommendations, kpis.
kpis must include revenueTrend, bedOccupancy, appointmentTrend, departmentPerformance, staffWorkload.

Data window: last ${days} days
Raw metrics:
${JSON.stringify(
  {
    totalRevenueInr: totalRevenue / 100,
    totalAppointments,
    completedAppointments,
    admittedPatients: patients,
    bedCapacity,
    bedOccupancyPercent,
    topDepartments: departments,
    doctorWorkload,
    nurseWorkload,
  },
  null,
  2,
)}
`,
    fallback: fallbackOpsSummary(),
  });

  const parsed = operationsAnalystResponseSchema.safeParse(aiPayload);
  if (!parsed.success) {
    return fallbackOpsSummary();
  }

  return {
    ...parsed.data,
    rawMetrics: {
      totalRevenueInr: totalRevenue / 100,
      totalAppointments,
      completedAppointments,
      admittedPatients: patients,
      bedOccupancyPercent,
    },
  };
}
