import type { Request, Response } from "express";
import { logActivity } from "../lib/activity";
import {
  clinicalAssistantRequestSchema,
  nlSearchRequestSchema,
  operationsAnalystRequestSchema,
} from "../lib/aiSchemas";
import { generateClinicalAssistant } from "../lib/aiClinicalAssistant";
import { generateOperationsAnalyst } from "../lib/aiOperationsAnalyst";
import { executeNaturalLanguageSearch } from "../lib/aiNlSearch";

export const getClinicalAssistantInsights = async (
  req: Request,
  res: Response,
) => {
  try {
    const parsed = clinicalAssistantRequestSchema.safeParse(req.body);
    console.log("Req Body : ", req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsed.error.flatten(),
      });
    }

    const data = await generateClinicalAssistant(parsed.data.patientId);
    await logActivity(
      (req as any).user.id,
      "Generated AI Clinical Assistant Insight",
      `patientId=${parsed.data.patientId}`,
    );
    console.log("Data: ", data);
    res.status(200).json({ data });
  } catch (error: any) {
    console.error("Error generating clinical assistant insights:", error);
    res.status(500).json({
      message:
        error?.message || "Failed to generate clinical assistant insights",
    });
  }
};

export const getOperationsAnalystInsights = async (
  req: Request,
  res: Response,
) => {
  try {
    const parsed = operationsAnalystRequestSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid query params",
        errors: parsed.error.flatten(),
      });
    }

    const data = await generateOperationsAnalyst(parsed.data.days);
    await logActivity(
      (req as any).user.id,
      "Generated AI Operations Insights",
      `days=${parsed.data.days}`,
    );

    res.status(200).json({ data });
  } catch (error: any) {
    console.error("Error generating operations analyst insights:", error);
    res.status(500).json({
      message: error?.message || "Failed to generate AI operations insights",
    });
  }
};

export const naturalLanguageSearch = async (req: Request, res: Response) => {
  try {
    const parsed = nlSearchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsed.error.flatten(),
      });
    }

    const data = await executeNaturalLanguageSearch(
      parsed.data.query,
      parsed.data.limit,
    );
    await logActivity(
      (req as any).user.id,
      "Performed AI Natural Language Search",
      parsed.data.query,
    );

    res.status(200).json({ data });
  } catch (error: any) {
    console.error("Error running AI natural language search:", error);
    res.status(500).json({
      message: error?.message || "Failed to run natural language search",
    });
  }
};
