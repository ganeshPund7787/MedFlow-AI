import mongoose, { Schema, Document } from "mongoose";

export interface IBackup extends Document {
  filename: string;
  sizeBytes: number;
  status: "success" | "failed";
  triggeredBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BackupSchema: Schema = new Schema(
  {
    filename: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    triggeredBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IBackup>("Backup", BackupSchema);
