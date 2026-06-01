import mongoose, { Schema, Document } from "mongoose";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface IPayment extends Document {
  patientId: string;
  invoiceId?: string;
  polarPaymentId?: string;
  polarOrderId?: string;
  polarCheckoutId?: string;
  polarEventId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  invoiceReference?: string;
  failureReason?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema(
  {
    patientId: { type: String, required: true, index: true },
    invoiceId: { type: String, index: true },
    polarPaymentId: { type: String, sparse: true },
    polarOrderId: { type: String, sparse: true },
    polarCheckoutId: { type: String, sparse: true },
    polarEventId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: "inr" },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded"],
      required: true,
      default: "pending",
    },
    invoiceReference: { type: String },
    failureReason: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IPayment>("Payment", PaymentSchema);
