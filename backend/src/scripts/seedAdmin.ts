import mongoose from "mongoose";
import { auth } from "../lib/auth";
import dotenv from "dotenv";
dotenv.config();

async function seedAdmin() {
  await mongoose.connect(process.env.MONGODB_URI!);

  // Check if admin already exists
  const existing = await mongoose.connection
    .collection("user")
    .findOne({ email: "admin@hospital.com" });

  if (existing) {
    console.log("Admin already exists");
    process.exit(0);
  }

  // Create admin via Better Auth
  await auth.api.signUpEmail({
    body: {
      email: "admin@hospital.com",
      password: "Admin@123",
      name: "Super Admin",
    },
  });

  // Set role to admin
  await mongoose.connection
    .collection("user")
    .updateOne({ email: "admin@hospital.com" }, { $set: { role: "admin" } });

  console.log("✅ Admin seeded successfully");
  process.exit(0);
}

seedAdmin();
