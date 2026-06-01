import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import {
  getInventory,
  addMedication,
  getPrescriptions,
  createPrescription,
  dispensePrescription,
} from "../controllers/pharmacy";

const pharmacyRouter = Router();

// Inventory Routes
pharmacyRouter.get(
  "/inventory",
  requireAuth,
  checkRole(["admin", "pharmacist", "doctor"]),
  getInventory
);

pharmacyRouter.post(
  "/inventory",
  requireAuth,
  checkRole(["admin", "pharmacist"]),
  addMedication
);

// Prescription Routes
pharmacyRouter.get(
  "/prescriptions",
  requireAuth,
  checkRole(["admin", "pharmacist", "doctor", "patient"]),
  getPrescriptions
);

pharmacyRouter.post(
  "/prescriptions",
  requireAuth,
  checkRole(["admin", "doctor"]),
  createPrescription
);

pharmacyRouter.post(
  "/dispense/:id",
  requireAuth,
  checkRole(["admin", "pharmacist"]),
  dispensePrescription
);

export default pharmacyRouter;
