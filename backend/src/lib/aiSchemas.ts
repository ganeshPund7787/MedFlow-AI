import { z } from "zod";

export const clinicalAssistantRequestSchema = z.object({
  patientId: z.string().min(1),
});

export const operationsAnalystRequestSchema = z.object({
  days: z.coerce.number().int().min(7).max(365).optional().default(30),
});

export const nlSearchRequestSchema = z.object({
  query: z.string().min(5).max(240),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// export const clinicalAssistantResponseSchema = z.object({
//   patientSummary: z.string(),
//   medicalHistorySummary: z.string(),
//   medicationSummary: z.string(),
//   missedFollowUps: z.array(z.string()),
//   abnormalTrends: z.array(z.string()),
//   riskAlerts: z.array(z.string()),
// });

// Helper: accepts string or array, always outputs string[]
const stringOrArray = z.union([
  z.array(z.string()),
  z.string().transform((s) =>
    s
      .split(/,\s*/)
      .map((x) => x.trim())
      .filter(Boolean),
  ),
]);

export const clinicalAssistantResponseSchema = z.object({
  patientSummary: z.string(),
  medicalHistorySummary: z.string(),
  medicationSummary: z.string(),
  missedFollowUps: stringOrArray,
  abnormalTrends: stringOrArray,
  riskAlerts: stringOrArray,
});

export const operationsAnalystResponseSchema = z.object({
  executiveSummary: z.string(),
  forecasts: z.array(z.string()),
  bottlenecks: z.array(z.string()),
  recommendations: z.array(z.string()),
  kpis: z.object({
    revenueTrend: z.string(),
    bedOccupancy: z.string(),
    appointmentTrend: z.string(),
    departmentPerformance: z.string(),
    staffWorkload: z.string(),
  }),
});

export const nlSearchResponseSchema = z.object({
  intent: z.string(),
  collection: z.enum(["user", "invoice", "appointment"]),
  mongoFilter: z.record(z.string(), z.unknown()),
  summary: z.string(),
});
