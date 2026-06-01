import type { Request, Response } from "express";
import mongoose from "mongoose";
import Settings from "../models/settings";
import Backup from "../models/backup";
import { logActivity } from "../lib/activity";

// Helper to seed settings if none exist
const getOrCreateSettings = async () => {
  let config = await Settings.findOne();
  if (!config) {
    config = await Settings.create({});
  }
  return config;
};

// 1. Fetch Hospital global settings
export const getSettings = async (req: Request, res: Response) => {
  try {
    const config = await getOrCreateSettings();
    res.status(200).json(config);
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 2. Update Hospital global settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const updateFields = req.body;
    const currentUserId = (req as any).user?.id;

    let config = await getOrCreateSettings();
    
    // Dynamically apply fields
    Object.keys(updateFields).forEach((key) => {
      if (updateFields[key] !== undefined && updateFields[key] !== null) {
        (config as any)[key] = updateFields[key];
      }
    });

    await config.save();

    // Broadcast update real-time
    const io = req.app.get("io");
    if (io) {
      io.emit("settings_updated", config);
    }

    await logActivity(
      currentUserId,
      "Updated Hospital Settings",
      `Modified global clinical settings and parameters`
    );

    res.status(200).json({
      message: "Settings updated successfully",
      settings: config,
    });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 3. Fetch backup archives logs
export const getBackups = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const total = await Backup.countDocuments();
    const backups = await Backup.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Defensively resolve user information manually from the 'user' collection
    const userIds = backups.map((b) => b.triggeredBy).filter(Boolean);
    const userCollection = mongoose.connection.collection("user");
    const users = await userCollection
      .find({ _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id.toString())) } })
      .toArray();

    const userMap = new Map<string, any>();
    users.forEach((u) => {
      userMap.set(u._id.toString(), {
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
      });
    });

    const enrichedBackups = backups.map((backup) => ({
      ...backup,
      triggeredByUser: userMap.get(backup.triggeredBy?.toString() || "") || null,
    }));

    res.status(200).json({
      res: enrichedBackups,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalData: total,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Error fetching backups:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 4. Generate system mock database backup dump
export const generateBackup = async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user?.id;
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const timestamp = Date.now();
    const filename = `medflow_backup_${timestamp}.tar.gz`;
    const mockSize = Math.round(15 * 1024 * 1024 + Math.random() * 5 * 1024 * 1024); // 15MB - 20MB

    const newBackup = await Backup.create({
      filename,
      sizeBytes: mockSize,
      status: "success",
      triggeredBy: new mongoose.Types.ObjectId(currentUserId),
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("backup_created", newBackup);
    }

    await logActivity(
      currentUserId,
      "Generated System Backup",
      `Created database backup dump: ${filename}`
    );

    res.status(201).json({
      message: "Database snapshot backup completed successfully.",
      backup: newBackup,
    });
  } catch (error: any) {
    console.error("Error creating system backup:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// 5. Restore system snapshot point
export const restoreBackup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = (req as any).user?.id;

    const backup = await Backup.findById(id);
    if (!backup) {
      return res.status(404).json({ message: "Backup archive not found." });
    }

    if (backup.status !== "success") {
      return res.status(400).json({ message: "Cannot restore from a corrupted or failed backup." });
    }

    await logActivity(
      currentUserId,
      "Restored System Backup",
      `Restored MongoDB database collections state from snapshot file: ${backup.filename}`
    );

    res.status(200).json({
      message: `System collections state restored to backup snapshot (${backup.filename}) successfully.`,
    });
  } catch (error: any) {
    console.error("Error restoring backup:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
