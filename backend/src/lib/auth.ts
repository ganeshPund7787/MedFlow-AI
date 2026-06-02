import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import {
  polar,
  checkout,
  portal,
  usage,
  webhooks,
} from "@polar-sh/better-auth";
import { handlePolarWebhookPayload } from "./polarPayments";
import { polarClient } from "./polarClient";

export { polarClient };

const client = new MongoClient(process.env.MONGO_URI || "");
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  // if you comment this out, thunder client will be able to create user, but let add origin on thunder client to test it out
  trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:5173"],
  trustedOriginsMode: "allow",
  trustedOriginsStrict: false,
  trustedOriginsAllowSubdomains: true,
  trustedOriginsAllowWildcards: true,
  trustedOriginsAllowCredentials: true,
  trustedOriginsAllowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  trustedOriginsAllowHeaders: ["Content-Type", "Authorization"],
  trustedOriginsAllowExposedHeaders: ["Content-Type", "Authorization"],
  trustedOriginsAllowMaxAge: 3600,
  trustedOriginsAllowPreflightContinue: false,
  trustedOriginsAllowPassThrough: false,
  emailAndPassword: { enabled: true },
  plugins: [
    admin({
      defaultRole: "patient",
      // but we are going to work without it since will have a middleware to check permissions based on the role in the session
      adminRole: ["admin", "superadmin"],
    }),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          authenticatedUsersOnly: true,
        }),
        portal({
          returnUrl: `${process.env.FRONTEND_URL}/dashboard`,
        }),
        usage(),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET!,
          onPayload: async ({ data, type }) => {
            try {
              await handlePolarWebhookPayload({ type, data });
            } catch (error) {
              console.error("[polar] Webhook handler error:", error);
              throw error;
            }
          },
        }),
      ],
    }),
  ],
  user: {
    additionalFields: {
      specialization: {
        type: "string",
        required: false, // Only for doctors
      },
      department: {
        type: "string",
        required: false,
      },
      gender: {
        type: "string",
        required: false,
      },
      bloodgroup: {
        type: "string",
        required: false,
      },
      medicalHistory: {
        type: "string",
        required: false,
      },
      age: {
        type: "string",
        required: false,
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "active",
      },
      prescriptions: {
        type: "string[]",
        required: false,
      },
      appointments: {
        type: "string[]",
        required: false,
      },
    },
  },
  logger: {
    level: "debug", // logs origin errors, invalid password, etc.
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      console.log("[auth] before", {
        path: ctx.path,
        method: ctx.request?.method,
        origin: ctx.request?.headers.get("origin"),
        referer: ctx.request?.headers.get("referer"),
        hasCookie: ctx.request?.headers.has("cookie"),
      });
    }),
    after: createAuthMiddleware(async (ctx) => {
      console.log("[auth] after", { path: ctx.path });
    }),
  },
  onAPIError: {
    onError: (error) => {
      console.error("[auth] API error", error);
    },
  },
});

// more advanced example with role-based access control using the admin plugin
admin({
      defaultRole: "patient",
      // Define the authorized roles for the admin plugin
      // This allows you to use authClient.admin.setRole() etc.
      adminRole: ["admin", "superadmin"],

      // Fine-grained permissions (Statements)
      // This is helpful if you use auth.api.checkPermission() in your backend
      roles: {
        admin: {
          statements: [{ resource: "all", action: "all" }]
        },
        doctor: {
          statements: [
            { resource: "patient", action: "read" },
            { resource: "patient", action: "update" },
            { resource: "lab_results", action: "all" },
            { resource: "prescriptions", action: "all" }
          ]
        },
        nurse: {
          statements: [
            { resource: "patient", action: "read" },
            { resource: "vitals", action: "create" },
            { resource: "lab_results", action: "read" }
          ]
        },
        pharmacist: {
          statements: [
            { resource: "prescriptions", action: "read" },
            { resource: "billing", action: "all" }
          ]
        },
        lab_tech: {
          statements: [
            { resource: "lab_results", action: "create" },
            { resource: "lab_results", action: "update" }
          ]
        },
        patient: {
          statements: [
            { resource: "my_profile", action: "read" },
            { resource: "my_billing", action: "read" }
          ]
        }
      }
    })
