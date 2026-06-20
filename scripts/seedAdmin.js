import "dotenv/config";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import UserModel from "../models/user.model.js";

const ADMIN_EMAIL = (
  process.env.ADMIN_SEED_EMAIL || "admin@keyshop.vn"
).toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || "Admin@123456";
const ADMIN_NAME = process.env.ADMIN_SEED_NAME || "KEYSHOP Admin";

async function seedAdmin() {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required");
  }

  await mongoose.connect(process.env.MONGODB_URL);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existing = await UserModel.findOne({ email: ADMIN_EMAIL }).select(
    "+password",
  );

  if (existing) {
    existing.name = ADMIN_NAME;
    existing.password = passwordHash;
    existing.role = "ADMIN";
    existing.verify_email = true;
    existing.status = "Active";
    existing.authProvider = "local";
    await existing.save();
    console.log(`Updated admin user: ${ADMIN_EMAIL}`);
  } else {
    await UserModel.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: passwordHash,
      role: "ADMIN",
      verify_email: true,
      status: "Active",
      authProvider: "local",
    });
    console.log(`Created admin user: ${ADMIN_EMAIL}`);
  }

  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log("Use these credentials at http://localhost:3001/auth/login");
}

seedAdmin()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error("Admin seed failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
