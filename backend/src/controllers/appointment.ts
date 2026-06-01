import type { Request, Response } from "express";
import mongoose from "mongoose";
import Appointment from "../models/appointment";
import { logActivity } from "../lib/activity";

// 1. Create a new appointment
export const createAppointment = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, nurseId, date, time, reason, isVirtual } = req.body;
    const currentUserId = (req as any).user?.id;

    if (!patientId || !doctorId || !date || !time || !reason) {
      return res.status(400).json({ message: "Patient, doctor, date, time, and reason are required." });
    }

    const userCollection = mongoose.connection.collection("user");
    
    // Validate patient exists
    const patient = await userCollection.findOne({ _id: new mongoose.Types.ObjectId(patientId), role: "patient" });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Validate doctor exists
    const doctor = await userCollection.findOne({ _id: new mongoose.Types.ObjectId(doctorId), role: "doctor" });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    // Create unique meetingId for telemedicine if isVirtual is true
    const meetingId = isVirtual ? `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : "";

    const newAppointment = await Appointment.create({
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: new mongoose.Types.ObjectId(doctorId),
      nurseId: nurseId ? new mongoose.Types.ObjectId(nurseId) : undefined,
      date: new Date(date),
      time,
      reason,
      isVirtual: Boolean(isVirtual),
      meetingId,
      status: "scheduled",
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("appointment_created", { appointmentId: newAppointment._id });
    }

    await logActivity(
      currentUserId,
      "Scheduled Appointment",
      `Scheduled clinical appointment for patient ${patient.name || patientId} on ${date} at ${time}`
    );

    res.status(201).json({
      message: "Appointment scheduled successfully",
      appointment: newAppointment,
    });
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 2. Get appointments (with custom role filters)
export const getAppointments = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const currentUser = (req as any).user;
    const filter: any = {};

    // Filter based on roles
    if (currentUser.role === "patient") {
      filter.patientId = new mongoose.Types.ObjectId(currentUser.id);
    } else if (currentUser.role === "doctor") {
      filter.doctorId = new mongoose.Types.ObjectId(currentUser.id);
    } else if (currentUser.role === "nurse") {
      filter.nurseId = new mongoose.Types.ObjectId(currentUser.id);
    }

    const total = await Appointment.countDocuments(filter);
    const appointments = await Appointment.find(filter)
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Defensively resolve user information manually from the 'user' collection
    const userIds = new Set<string>();
    appointments.forEach((appt) => {
      if (appt.patientId) userIds.add(appt.patientId.toString());
      if (appt.doctorId) userIds.add(appt.doctorId.toString());
      if (appt.nurseId) userIds.add(appt.nurseId.toString());
    });

    const userCollection = mongoose.connection.collection("user");
    const users = await userCollection
      .find({ _id: { $in: Array.from(userIds).map((id) => new mongoose.Types.ObjectId(id)) } })
      .toArray();

    const userMap = new Map<string, any>();
    users.forEach((u) => {
      userMap.set(u._id.toString(), {
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        image: u.image,
      });
    });

    const enrichedAppointments = appointments.map((appt) => ({
      ...appt,
      patient: userMap.get(appt.patientId?.toString() || "") || null,
      doctor: userMap.get(appt.doctorId?.toString() || "") || null,
      nurse: userMap.get(appt.nurseId?.toString() || "") || null,
    }));

    res.status(200).json({
      res: enrichedAppointments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalData: total,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 3. Update appointment (Confirm, Complete, Cancel, Reschedule)
export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, date, time, reason } = req.body;
    const currentUserId = (req as any).user?.id;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    const updatePayload: any = {};
    if (status) updatePayload.status = status;
    if (date) updatePayload.date = new Date(date);
    if (time) updatePayload.time = time;
    if (reason) updatePayload.reason = reason;

    // If appointment is completed or cancelled, trigger billing/logs as necessary
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true }
    );

    const io = req.app.get("io");
    if (io) {
      io.emit("appointment_updated", updatedAppointment);
    }

    await logActivity(
      currentUserId,
      "Updated Appointment",
      `Updated appointment #${id} with status ${status || "N/A"}`
    );

    res.status(200).json({
      message: "Appointment updated successfully",
      appointment: updatedAppointment,
    });
  } catch (error: any) {
    console.error("Error updating appointment:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
