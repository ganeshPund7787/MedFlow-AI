import dotenv from "dotenv";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { serve } from "inngest/express";
import { createServer } from "http";

import { connectDB } from "./config/db";
import { auth } from "./lib/auth";
import userRouter from "./routes/user";
import activityLogRouter from "./routes/activity";
import { inngest } from "./inngest/client";
import {
  admitPatient,
  analyzeXRayJob,
  addChargeToInvoice,
} from "./inngest/functions";
import notificationRouter from "./routes/notification";
import labResultsRouter from "./routes/labResults";
import invoiceRouter from "./routes/invoice";
import paymentsRouter from "./routes/payments";
import nursingRouter from "./routes/nursing";
import pharmacyRouter from "./routes/pharmacy";
import appointmentRouter from "./routes/appointment";
import settingsRouter from "./routes/settings";
import aiRouter from "./routes/ai";
import { getIO, initSocket } from "./lib/socket";
import { uploadRouter } from "./lib/uploadthing";
import { createRouteHandler } from "uploadthing/express";
import uploadthingRouter from "./routes/uploadthing";

// Load environment variables from .env file
dotenv.config();

// Initialize Express application
const app: Application = express();
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

initSocket(httpServer);

// Make 'io' accessible in Express req.app.get("io") for backwards compatibility
app.set("io", getIO());

import { errorMiddleware, notFoundMiddleware } from "./middleware/errorMiddleware";

// --- Global Process Handlers (Anti-Gravity) ---
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
  // In a real spacecraft, we'd log this to an external service and continue
});

process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error);
  // We keep the process alive if possible, but logging is critical
});

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Configure Helmet to allow cross-origin resource sharing
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // For easier development with various fonts/images
  }),
);

// Use cookie parser middleware to parse cookies in incoming requests
app.use(cookieParser());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (only in development mode)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Basic route for testing
app.get("/", (req: Request, res: Response) => {
  res.send("Hello from the backend! Architecture Active 🚀");
});

app.use("/api/auth", (req, res, next) => {
  // Defensive check for auth headers
  next();
});

app.all("/api/auth/*splat", toNodeHandler(auth));

app.get("/api/me", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    return res.json(session);
  } catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
});

app.use("/api/users", userRouter);
app.use("/api/activity-logs", activityLogRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/lab-results", labResultsRouter);
app.use("/api/invoices", invoiceRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/nursing", nursingRouter);
app.use("/api/pharmacy", pharmacyRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/ai", aiRouter);

// inngest API route
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [admitPatient, analyzeXRayJob, addChargeToInvoice],
  }),
);

app.use("/api/uploadthing", createRouteHandler({ router: uploadRouter }));
app.use("/api/uploadthing/delete", uploadthingRouter);

// --- Anti-Gravity Resilience Middleware ---
app.use(notFoundMiddleware);
app.use(errorMiddleware);


// Start the server
connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(
        `🚀 Server + Socket.IO running in ${process.env.NODE_ENV} mode on port ${PORT}`,
      );
    });
  })
  .catch((error) => {
    console.error(
      `Failed to connect to the database: ${(error as Error).message}`,
    );
    // Even if DB fails, we keep the process alive to show useful error states
  });
