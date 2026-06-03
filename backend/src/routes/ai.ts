import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import { aiRouteRateLimit } from "../middleware/aiRateLimit";
import {
  getClinicalAssistantInsights,
  getOperationsAnalystInsights,
  naturalLanguageSearch,
} from "../controllers/ai";

const aiRouter = Router();

aiRouter.use(requireAuth, aiRouteRateLimit);

aiRouter.post(
  "/clinical-assistant",
  checkRole(["admin", "doctor", "nurse"]),
  getClinicalAssistantInsights,
);

aiRouter.get(
  "/operations-analyst",
  checkRole(["admin"]),
  getOperationsAnalystInsights,
);

aiRouter.post(
  "/nl-search",
  checkRole(["admin", "doctor", "nurse", "pharmacist", "lab_tech"]),
  naturalLanguageSearch,
);

export default aiRouter;
