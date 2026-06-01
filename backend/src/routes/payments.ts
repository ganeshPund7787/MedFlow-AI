import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import {
  getRevenueOverview,
  getAllPayments,
  getMyPayments,
} from "../controllers/payments";

const paymentsRouter = Router();

paymentsRouter.get(
  "/revenue-overview",
  requireAuth,
  checkRole(["admin"]),
  getRevenueOverview,
);

paymentsRouter.get(
  "/",
  requireAuth,
  checkRole(["admin"]),
  getAllPayments,
);

paymentsRouter.get(
  "/my-history",
  requireAuth,
  checkRole(["patient"]),
  getMyPayments,
);

export default paymentsRouter;
