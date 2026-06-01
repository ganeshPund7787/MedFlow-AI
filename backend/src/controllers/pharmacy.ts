import type { Request, Response } from "express";
import mongoose from "mongoose";
import Medication from "../models/medication";
import Prescription from "../models/prescription";
import { logActivity } from "../lib/activity";
import { inngest } from "../inngest/client";

// 1. Get all medications (Inventory)
export const getInventory = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const filter: any = {};
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const total = await Medication.countDocuments(filter);
    const medications = await Medication.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      res: medications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalData: total,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 2. Add or update medication in inventory
export const addMedication = async (req: Request, res: Response) => {
  try {
    const { name, code, description, stock, priceInCents } = req.body;
    const currentUserId = (req as any).user?.id;

    if (!name || !code || priceInCents === undefined) {
      return res.status(400).json({ message: "Name, code, and price (in cents) are required." });
    }

    // Check if medication with this code already exists
    let medication = await Medication.findOne({ code });
    if (medication) {
      // Update stock and description if it exists
      medication.stock += Number(stock || 0);
      if (description) medication.description = description;
      medication.priceInCents = Number(priceInCents);
      await medication.save();
    } else {
      // Create new medication
      medication = await Medication.create({
        name,
        code,
        description,
        stock: Number(stock || 0),
        priceInCents: Number(priceInCents),
      });
    }

    // Emit Socket.IO event for real-time stock refresh
    const io = req.app.get("io");
    if (io) {
      io.emit("stock_updated", { medicationId: medication._id, stock: medication.stock });
    }

    await logActivity(
      currentUserId,
      "Updated Pharmacy Stock",
      `Stock updated for ${name} (${code}) to ${medication.stock}`
    );

    res.status(200).json({
      message: "Inventory updated successfully",
      medication,
    });
  } catch (error: any) {
    console.error("Error updating medication:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 3. Get Prescriptions (Doctor / Pharmacist view)
export const getPrescriptions = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const filter: any = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    // Check if role is doctor or patient to filter accordingly
    const currentUser = (req as any).user;
    if (currentUser.role === "patient") {
      filter.patientId = new mongoose.Types.ObjectId(currentUser.id);
    } else if (currentUser.role === "doctor") {
      // Optionally let doctors see all or just their own prescriptions. Let's let them see all, or filter.
    }

    const total = await Prescription.countDocuments(filter);
    const prescriptions = await Prescription.find(filter)
      .populate("medications.medicationId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Resolve patients and doctors details manually from 'user' collection defensively
    const userCollection = mongoose.connection.collection("user");
    const userIds = new Set<string>();

    prescriptions.forEach((pres) => {
      if (pres.patientId) userIds.add(pres.patientId.toString());
      if (pres.doctorId) userIds.add(pres.doctorId.toString());
    });

    const users = await userCollection
      .find({ _id: { $in: Array.from(userIds).map((id) => new mongoose.Types.ObjectId(id)) } })
      .toArray();

    const userMap = new Map<string, any>();
    users.forEach((user) => {
      userMap.set(user._id.toString(), {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      });
    });

    const enrichedPrescriptions = prescriptions.map((pres) => ({
      ...pres,
      patient: userMap.get(pres.patientId?.toString() || "") || null,
      doctor: userMap.get(pres.doctorId?.toString() || "") || null,
    }));

    res.status(200).json({
      res: enrichedPrescriptions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalData: total,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Error fetching prescriptions:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 4. Create new prescription (Doctors only)
export const createPrescription = async (req: Request, res: Response) => {
  try {
    const { patientId, medications, notes } = req.body;
    const doctorId = (req as any).user?.id;

    if (!patientId || !medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ message: "Patient ID and medications array are required." });
    }

    const userCollection = mongoose.connection.collection("user");
    const patientObjId = new mongoose.Types.ObjectId(patientId);

    const patient = await userCollection.findOne({ _id: patientObjId, role: "patient" });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Verify all medicationIds exist
    for (const med of medications) {
      const dbMed = await Medication.findById(med.medicationId);
      if (!dbMed) {
        return res.status(404).json({ message: `Medication with ID ${med.medicationId} not found.` });
      }
    }

    const prescription = await Prescription.create({
      patientId: patientObjId,
      doctorId: new mongoose.Types.ObjectId(doctorId),
      medications: medications.map((med) => ({
        medicationId: new mongoose.Types.ObjectId(med.medicationId),
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        quantity: Number(med.quantity || 1),
      })),
      status: "pending",
      notes,
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("prescription_created", { prescriptionId: prescription._id });
    }

    await logActivity(
      doctorId,
      "Created Prescription",
      `Prescribed medication for patient ${patient.name || patientId}`
    );

    res.status(201).json({
      message: "Prescription created successfully",
      prescription,
    });
  } catch (error: any) {
    console.error("Error creating prescription:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 5. Dispense prescription (Pharmacist only)
export const dispensePrescription = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const pharmacistId = (req as any).user?.id;

    const prescription = await Prescription.findById(id).session(session);
    if (!prescription) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Prescription not found." });
    }

    if (prescription.status !== "pending") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: `Prescription has already been ${prescription.status}.` });
    }

    let totalCost = 0;
    const itemChargeDetails: string[] = [];

    // Verify stock and calculate price
    for (const item of prescription.medications) {
      const medication = await Medication.findById(item.medicationId).session(session);
      if (!medication) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "Medication not found in inventory." });
      }

      if (medication.stock < item.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: `Insufficient inventory stock for ${medication.name}. In stock: ${medication.stock}, Requested: ${item.quantity}`,
        });
      }

      // Deduct stock
      medication.stock -= item.quantity;
      await medication.save({ session });

      totalCost += medication.priceInCents * item.quantity;
      itemChargeDetails.push(`${medication.name} (x${item.quantity})`);
    }

    // Set status to dispensed
    prescription.status = "dispensed";
    await prescription.save({ session });

    // Commit Transaction
    await session.commitTransaction();
    session.endSession();

    // Trigger asynchronous background billing using Inngest event pipeline!
    if (totalCost > 0) {
      await inngest.send({
        name: "billing/charge.added",
        data: {
          patientId: prescription.patientId.toString(),
          description: `Pharmacy: Dispensed prescription items - ${itemChargeDetails.join(", ")}`,
          priceInCents: totalCost,
        },
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("prescription_dispensed", { prescriptionId: prescription._id });
      io.emit("stock_updated"); // Global inventory updates
    }

    const userCollection = mongoose.connection.collection("user");
    const patient = await userCollection.findOne({ _id: prescription.patientId });

    await logActivity(
      pharmacistId,
      "Dispensed Prescription",
      `Dispensed prescription #${prescription._id} to patient ${patient?.name || prescription.patientId}`
    );

    res.status(200).json({
      message: "Prescription dispensed successfully and billing charge added.",
      prescription,
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error dispensing prescription:", error);
    res.status(500).json({ message: "Internal server error during dispensing." });
  }
};
