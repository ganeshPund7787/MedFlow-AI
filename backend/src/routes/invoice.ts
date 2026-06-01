import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createCheckoutSession,
  getMyActiveInvoice,
  getBillingHistory,
  allBilling,
  getFinancialStats,
} from "../controllers/invoice";
import { checkRole } from "../middleware/checkRole";

const invoiceRouter = Router();

// Stats summary for admin financial records
invoiceRouter.get(
  "/stats",
  requireAuth,
  checkRole(["admin"]),
  getFinancialStats
);

// Active invoice and profile billing routes
invoiceRouter.get(
  "/my-active-invoice",
  requireAuth,
  checkRole(["patient"]),
  getMyActiveInvoice,
);

invoiceRouter.get("/history/:id", requireAuth, getBillingHistory);
invoiceRouter.post("/:id/checkout", requireAuth, createCheckoutSession);

// Support both GET and POST at root / to accommodate api.ts post request with full backwards compatibility
invoiceRouter.get("/", requireAuth, checkRole(["admin"]), allBilling);
invoiceRouter.post("/", requireAuth, checkRole(["admin"]), allBilling);

export default invoiceRouter;
