import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createCheckoutSession,
  confirmPolarCheckout,
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
  checkRole(["patient", "admin"]),
  getMyActiveInvoice,
);

invoiceRouter.get(
  "/history/:patientId",
  requireAuth,
  checkRole(["admin", "patient"]),
  getBillingHistory,
);
invoiceRouter.post(
  "/:id/checkout",
  requireAuth,
  checkRole(["patient"]),
  createCheckoutSession,
);
invoiceRouter.post(
  "/confirm-checkout",
  requireAuth,
  checkRole(["patient"]),
  confirmPolarCheckout,
);

// Support both GET and POST at root / to accommodate api.ts post request with full backwards compatibility
invoiceRouter.get("/", requireAuth, checkRole(["admin"]), allBilling);
invoiceRouter.post("/", requireAuth, checkRole(["admin"]), allBilling);

export default invoiceRouter;
