import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import {
  recordVitals,
  getPatientVitals,
  getNursingPatients,
} from "../controllers/nursing";

const nursingRouter = Router();

// GET: Fetch all active patients with latest vitals
nursingRouter.get(
  "/patients",
  requireAuth,
  checkRole(["admin", "nurse", "doctor"]),
  getNursingPatients
);

// POST: Record new patient vitals
nursingRouter.post(
  "/vitals",
  requireAuth,
  checkRole(["admin", "nurse", "doctor"]),
  recordVitals
);

// GET: Fetch vitals history for a single patient
nursingRouter.get(
  "/vitals/:patientId",
  requireAuth,
  checkRole(["admin", "nurse", "doctor", "patient"]),
  getPatientVitals
);

export default nursingRouter;
