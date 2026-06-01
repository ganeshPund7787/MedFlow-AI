import mongoose, { Schema, Document } from "mongoose";

export interface IPrescription extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  medications: Array<{
    medicationId: mongoose.Types.ObjectId;
    dosage: string;    // e.g., '500mg'
    frequency: string; // e.g., 'Twice daily'
    duration: string;  // e.g., '7 days'
    quantity: number;  // e.g., 14
  }>;
  status: "pending" | "dispensed" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionSchema: Schema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    medications: [
      {
        medicationId: { type: Schema.Types.ObjectId, ref: "Medication", required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "dispensed", "cancelled"],
      default: "pending",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IPrescription>("Prescription", PrescriptionSchema);
