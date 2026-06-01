import mongoose, { Schema, Document } from "mongoose";

export interface ISettings extends Document {
  // 1. General Settings & Hospital Information
  hospitalName: string;
  hospitalAddress: string;
  hospitalContact: string;
  hospitalEmail: string;
  hospitalLogo?: string;
  operationalHours: string;
  departments: string[];

  // 2. Security Settings
  sessionTimeoutMinutes: number; 
  passwordMinLength: number;
  requireTwoFactor: boolean;

  // 3. Email & Notifications
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSenderEmail?: string;
  enableEmailAlerts: boolean;
  enablePushNotifications: boolean;

  // 4. Billing, Payment & Integrations
  taxRatePercentage: number;
  polarApiKey?: string;
  polarWebhookSecret?: string;
  polarProductId?: string;
  enableLiveGateways: boolean;

  // 5. Module specific Settings
  slotDurationMinutes: number; 
  consultationFeeInCents: number; 
  labTurnaroundHours: number;
  enableAiXrayReview: boolean;
  medicationLowStockThreshold: number;

  // 6. AI Configuration
  aiModelName: string; 
  aiTemperature: number; 
  aiTriageInstructions: string;
}

const SettingsSchema: Schema = new Schema(
  {
    hospitalName: { type: String, required: true, default: "MedFlow AI General Hospital" },
    hospitalAddress: { type: String, required: true, default: "77 Quantum Heights, Suite 101, Metro City" },
    hospitalContact: { type: String, required: true, default: "+1 (555) 019-9000" },
    hospitalEmail: { type: String, required: true, default: "admin@medflow-ai.org" },
    hospitalLogo: { type: String, default: "" },
    operationalHours: { type: String, required: true, default: "24/7 emergency operations" },
    departments: { type: [String], default: ["Emergency", "Radiology", "Pediatrics", "Cardiology", "Pharmacy"] },

    sessionTimeoutMinutes: { type: Number, required: true, default: 30 },
    passwordMinLength: { type: Number, required: true, default: 8 },
    requireTwoFactor: { type: Boolean, required: true, default: false },

    smtpHost: { type: String, default: "smtp.mailtrap.io" },
    smtpPort: { type: Number, default: 2525 },
    smtpUser: { type: String, default: "" },
    smtpPass: { type: String, default: "" },
    smtpSenderEmail: { type: String, default: "noreply@medflow-ai.org" },
    enableEmailAlerts: { type: Boolean, required: true, default: true },
    enablePushNotifications: { type: Boolean, required: true, default: true },

    taxRatePercentage: { type: Number, required: true, default: 5 },
    polarApiKey: { type: String, default: "" },
    polarWebhookSecret: { type: String, default: "" },
    polarProductId: { type: String, default: "" },
    enableLiveGateways: { type: Boolean, required: true, default: false },

    slotDurationMinutes: { type: Number, required: true, default: 30 },
    consultationFeeInCents: { type: Number, required: true, default: 7500 }, // $75.00
    labTurnaroundHours: { type: Number, required: true, default: 24 },
    enableAiXrayReview: { type: Boolean, required: true, default: true },
    medicationLowStockThreshold: { type: Number, required: true, default: 15 },

    aiModelName: { type: String, required: true, default: "gemini-3-flash-preview" },
    aiTemperature: { type: Number, required: true, default: 0.2 },
    aiTriageInstructions: { 
      type: String, 
      required: true, 
      default: "Match this patient with the best Doctor and Nurse based on medical symptoms and specialties." 
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>("Settings", SettingsSchema);
