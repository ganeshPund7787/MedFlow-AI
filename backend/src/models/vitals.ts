import mongoose, { Schema, Document } from "mongoose";

export interface IVitals extends Document {
  patientId: mongoose.Types.ObjectId;
  recordedBy: mongoose.Types.ObjectId;
  bloodPressure: string;     // e.g., '120/80'
  heartRate: number;         // e.g., 72
  temperature: number;       // e.g., 36.5 (Celsius)
  respiratoryRate?: number;  // e.g., 16
  oxygenSaturation?: number; // e.g., 98
  weight?: number;           // e.g., 70
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VitalsSchema: Schema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
    bloodPressure: { type: String, required: true },
    heartRate: { type: Number, required: true },
    temperature: { type: Number, required: true },
    respiratoryRate: { type: Number },
    oxygenSaturation: { type: Number },
    weight: { type: Number },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IVitals>("Vitals", VitalsSchema);
