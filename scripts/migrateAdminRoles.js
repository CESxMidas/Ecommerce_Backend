import "dotenv/config";

import mongoose from "mongoose";

import UserModel from "../models/user.model.js";

async function migrateAdminRoles() {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required");
  }

  await mongoose.connect(process.env.MONGODB_URL);

  const result = await UserModel.updateMany(
    { role: "ADMIN" },
    { $set: { role: "OWNER" } },
  );

  console.log(`Migrated ${result.modifiedCount} ADMIN account(s) to OWNER`);
  await mongoose.disconnect();
}

migrateAdminRoles().catch(async (error) => {
  console.error("Role migration failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
