import mongoose, { Schema, Document } from "mongoose";

export interface IAppointment extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  nurseId?: mongoose.Types.ObjectId;
  date: Date;
  time: string; // e.g. '09:30'
  reason: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "in-progress";
  isVirtual: boolean;
  meetingId: string; // LiveKit/Jitsi room name
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    nurseId: { type: Schema.Types.ObjectId, ref: "user" },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "completed", "cancelled", "in-progress"],
      default: "scheduled",
    },
    isVirtual: { type: Boolean, default: false },
    meetingId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IAppointment>("Appointment", AppointmentSchema);
