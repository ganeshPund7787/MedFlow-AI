import mongoose from "mongoose";
import type { Request, Response } from "express";
import LabResult from "../models/labResults";
import { logActivity } from "../lib/activity";
import { scheduleXrayPipeline } from "../lib/xrayAnalysis";

// Create a new lab result
export const createLabResult = async (req: Request, res: Response) => {
  try {
    const { patientId, testType, bodyPart, imageUrl } = req.body;
    const currentUserId = (req as any).user?.id;

    if (!patientId || !testType) {
      return res
        .status(400)
        .json({ message: "Patient ID and test type are required." });
    }

    if (testType === "X-Ray" && !imageUrl) {
      return res
        .status(400)
        .json({ message: "X-Ray uploads require an image URL." });
    }

    const newLabResult = await LabResult.create({
      patient: patientId,
      testType,
      bodyPart,
      imageUrl,
      status: "pending",
      uploadedBy: currentUserId,
    });
    if (!newLabResult) {
      return res.status(400).json({ message: "Failed to create lab result" });
    }
    const io = req.app.get("io");
    if (io) {
      io.emit("lab_result_added");
    }

    await logActivity(
      currentUserId,
      "Uploaded Lab Result",
      `Uploaded ${testType} for ${bodyPart || "N/A"}`,
    );

    res.status(201).json(newLabResult);

    if (testType === "X-Ray" && newLabResult.imageUrl) {
      scheduleXrayPipeline({
        labResultId: newLabResult._id.toString(),
        imageUrl: newLabResult.imageUrl,
        bodyPart: newLabResult.bodyPart || "General",
        patientId: newLabResult.patient,
      });
    }
  } catch (error) {
    console.error("Error creating lab result:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 2. Get all Lab Results for a specific patient
export const getPatientLabResults = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required." });
    }

    const results = await LabResult.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(
      results.map((r) => ({
        ...r,
        _id: r._id.toString(),
        patientId: r.patient?.toString(),
      })),
    );
  } catch (error) {
    console.error("Error fetching lab results:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 3. Update Lab Result (Used for saving AI Analysis or Doctor Notes)
export const updateLabResult = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { aiAnalysis, doctorNotes, status } = req.body;
    const updates: Record<string, string> = {};
    if (aiAnalysis !== undefined) updates.aiAnalysis = aiAnalysis;
    if (doctorNotes !== undefined) updates.doctorNotes = doctorNotes;
    if (status !== undefined) updates.status = status;

    const updatedResult = await LabResult.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }, // Return the updated document
    );

    if (!updatedResult) {
      return res.status(404).json({ message: "Lab result not found" });
    }
    const io = req.app.get("io");
    if (io) {
      io.emit("lab_result_updated", updatedResult);
    }
    // TODO: notify users
    await logActivity(
      (req as any).user.id,
      "Updated Lab Result",
      `Updated lab result ${id} with status ${status || "N/A"}`,
    );
    res.status(200).json(updatedResult);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 4. Get all Lab Results (Lab Queue for Techs / Doctors)
export const getAllLabResults = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const filter: any = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const total = await LabResult.countDocuments(filter);
    const results = await LabResult.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Defensive manual resolution of patient user documents from 'user' collection
    const patientIds = results.map((r) => r.patient).filter(Boolean);
    const userCollection = mongoose.connection.collection("user");
    const patients = await userCollection
      .find({ _id: { $in: patientIds.map((id) => new mongoose.Types.ObjectId(id.toString())) } })
      .toArray();

    const patientMap = new Map<string, any>();
    patients.forEach((p) => {
      patientMap.set(p._id.toString(), {
        _id: p._id.toString(),
        name: p.name,
        email: p.email,
        role: p.role,
        image: p.image,
      });
    });

    const enrichedResults = results.map((result) => ({
      ...result,
      patient: patientMap.get(result.patient?.toString() || "") || null,
    }));

    res.status(200).json({
      res: enrichedResults,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalData: total,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Error fetching all lab results:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
