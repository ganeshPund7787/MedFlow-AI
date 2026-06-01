import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import {
  getSettings,
  updateSettings,
  getBackups,
  generateBackup,
  restoreBackup,
} from "../controllers/settings";

const settingsRouter = Router();

// GET: Fetch global configurations document
settingsRouter.get(
  "/",
  requireAuth,
  checkRole(["admin", "doctor", "nurse", "pharmacist", "lab_tech"]), // Allow read access for configuration checking across staff
  getSettings
);

// PUT: Save configurations document
settingsRouter.put(
  "/",
  requireAuth,
  checkRole(["admin"]),
  updateSettings
);

// GET: Fetch backup archives logs
settingsRouter.get(
  "/backups",
  requireAuth,
  checkRole(["admin"]),
  getBackups
);

// POST: Trigger manual MongoDB dump
settingsRouter.post(
  "/backups",
  requireAuth,
  checkRole(["admin"]),
  generateBackup
);

// POST: Restore system state from file
settingsRouter.post(
  "/backups/:id/restore",
  requireAuth,
  checkRole(["admin"]),
  restoreBackup
);

export default settingsRouter;
