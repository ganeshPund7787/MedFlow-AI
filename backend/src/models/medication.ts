import mongoose, { Schema, Document } from "mongoose";

export interface IMedication extends Document {
  name: string;
  code: string; // SKU or Barcode identifier
  description?: string;
  stock: number;
  priceInCents: number; // For itemized billing charges
  createdAt: Date;
  updatedAt: Date;
}

const MedicationSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    stock: { type: Number, required: true, default: 0 },
    priceInCents: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IMedication>("Medication", MedicationSchema);
