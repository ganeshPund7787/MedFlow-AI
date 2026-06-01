import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import {
  createAppointment,
  getAppointments,
  updateAppointment,
} from "../controllers/appointment";

const appointmentRouter = Router();

// GET: Fetch appointments (Role based filtering handled defensively in controller)
appointmentRouter.get(
  "/",
  requireAuth,
  checkRole(["admin", "doctor", "nurse", "patient"]),
  getAppointments
);

// POST: Book a new appointment
appointmentRouter.post(
  "/",
  requireAuth,
  checkRole(["admin", "doctor", "nurse", "patient"]),
  createAppointment
);

// PUT: Reschedule or update appointment state (status transitions)
appointmentRouter.put(
  "/:id",
  requireAuth,
  checkRole(["admin", "doctor", "nurse", "patient"]),
  updateAppointment
);

export default appointmentRouter;
