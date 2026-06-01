import type { Request, Response } from "express";
import mongoose from "mongoose";
import Vitals from "../models/vitals";
import { logActivity } from "../lib/activity";

/** Better Auth users live in the `user` collection without a Mongoose model — avoid .populate(). */
async function lookupUserById(
  userCollection: mongoose.mongo.Collection,
  id: mongoose.Types.ObjectId | string | undefined,
  projection: Record<string, 1> = { name: 1, email: 1, role: 1 },
) {
  if (!id) return null;
  const objectId =
    id instanceof mongoose.Types.ObjectId
      ? id
      : new mongoose.Types.ObjectId(String(id));
  return userCollection.findOne({ _id: objectId }, { projection });
}

// 1. Record new patient vitals
export const recordVitals = async (req: Request, res: Response) => {
  try {
    const { patientId, bloodPressure, heartRate, temperature, respiratoryRate, oxygenSaturation, weight, notes } = req.body;
    const recorderId = (req as any).user?.id;

    if (!patientId || !bloodPressure || !heartRate || !temperature) {
      return res.status(400).json({ message: "Patient ID, blood pressure, heart rate, and temperature are required." });
    }

    const userCollection = mongoose.connection.collection("user");
    const patientObjectId = new mongoose.Types.ObjectId(patientId);

    const patient = await userCollection.findOne({ _id: patientObjectId, role: "patient" });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    const newVitals = await Vitals.create({
      patientId: patientObjectId,
      recordedBy: new mongoose.Types.ObjectId(recorderId),
      bloodPressure,
      heartRate: Number(heartRate),
      temperature: Number(temperature),
      respiratoryRate: respiratoryRate ? Number(respiratoryRate) : undefined,
      oxygenSaturation: oxygenSaturation ? Number(oxygenSaturation) : undefined,
      weight: weight ? Number(weight) : undefined,
      notes,
    });

    // Realtime notification via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.emit("vitals_recorded", { patientId, vitalsId: newVitals._id });
    }

    // Log the activity
    await logActivity(
      recorderId,
      "Recorded Vitals",
      `Recorded vitals for patient ${patient.name || patientId}`
    );

    res.status(201).json({
      message: "Vitals recorded successfully",
      vitals: newVitals,
    });
  } catch (error: any) {
    console.error("Error recording vitals:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 2. Fetch vitals history for a single patient
export const getPatientVitals = async (req: Request, res: Response) => {
  try {
    // const { patientId } = req.params;
    const { patientId } = req.params as { patientId: string };
    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required." });
    }

    const patientObjectId = new mongoose.Types.ObjectId(patientId);
    const userCollection = mongoose.connection.collection("user");
    const vitalsHistory = await Vitals.find({ patientId: patientObjectId })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      vitalsHistory.map(async (entry) => {
        const recorder = await lookupUserById(userCollection, entry.recordedBy);
        return { ...entry, recordedBy: recorder };
      }),
    );

    res.status(200).json(enriched);
  } catch (error: any) {
    console.error("Error fetching patient vitals:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 3. Fetch all active/admitted patients with their latest vitals
export const getNursingPatients = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const userCollection = mongoose.connection.collection("user");
    
    // Find all patients who are admitted or active
    const query = { role: "patient", status: "admitted" };
    const totalPatients = await userCollection.countDocuments(query);
    
    const patients = await userCollection
      .find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Map each patient to attach their latest vitals
    const patientsWithVitals = await Promise.all(
      patients.map(async (patient) => {
        const latestVitals = await Vitals.findOne({ patientId: patient._id })
          .sort({ createdAt: -1 })
          .lean();

        return {
          ...patient,
          latestVitals: latestVitals || null,
        };
      }),
    );

    res.status(200).json({
      res: patientsWithVitals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPatients / limit),
        totalData: totalPatients,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Error fetching nursing patients:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
