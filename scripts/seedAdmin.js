import "dotenv/config";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import UserModel from "../models/user.model.js";

const DEFAULT_ACCOUNTS = [
  {
    envEmail: "ADMIN_SEED_EMAIL",
    envPassword: "ADMIN_SEED_PASSWORD",
    envName: "ADMIN_SEED_NAME",
    fallbackEmail: "owner@keyshop.vn",
    fallbackPassword: "Owner@123456",
    fallbackName: "Chủ shop KEYSHOP",
    role: "OWNER",
    label: "Chủ shop (OWNER)",
  },
  {
    envEmail: "MANAGER_SEED_EMAIL",
    envPassword: "MANAGER_SEED_PASSWORD",
    envName: "MANAGER_SEED_NAME",
    fallbackEmail: "manager@keyshop.vn",
    fallbackPassword: "Manager@123456",
    fallbackName: "Quản lý KEYSHOP",
    role: "MANAGER",
    label: "Quản lý (MANAGER)",
  },
  {
    envEmail: "STAFF_SEED_EMAIL",
    envPassword: "STAFF_SEED_PASSWORD",
    envName: "STAFF_SEED_NAME",
    fallbackEmail: "staff@keyshop.vn",
    fallbackPassword: "Staff@123456",
    fallbackName: "Nhân viên KEYSHOP",
    role: "STAFF",
    label: "Nhân viên (STAFF)",
  },
];

function resolveAccount(config) {
  return {
    email: String(process.env[config.envEmail] || config.fallbackEmail).toLowerCase(),
    password: process.env[config.envPassword] || config.fallbackPassword,
    name: process.env[config.envName] || config.fallbackName,
    role: config.role,
    label: config.label,
  };
}

async function upsertStaffAccount(account) {
  const passwordHash = await bcrypt.hash(account.password, 10);
  const existing = await UserModel.findOne({ email: account.email }).select("+password");

  if (existing) {
    existing.name = account.name;
    existing.password = passwordHash;
    existing.role = account.role;
    existing.verify_email = true;
    existing.status = "Active";
    existing.authProvider = "local";
    await existing.save();
    return "updated";
  }

  await UserModel.create({
    name: account.name,
    email: account.email,
    password: passwordHash,
    role: account.role,
    verify_email: true,
    status: "Active",
    authProvider: "local",
  });

  return "created";
}

async function seedAdmin() {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required");
  }

  await mongoose.connect(process.env.MONGODB_URL);

  const seeded = [];

  for (const config of DEFAULT_ACCOUNTS) {
    const account = resolveAccount(config);
    const action = await upsertStaffAccount(account);
    seeded.push({ ...account, action });
  }

  console.log("\n=== Tài khoản đăng nhập Admin (http://localhost:3001/auth/login) ===\n");
  console.log("Vai trò".padEnd(24), "Email".padEnd(28), "Mật khẩu");
  console.log("-".repeat(72));

  for (const account of seeded) {
    console.log(
      account.label.padEnd(24),
      account.email.padEnd(28),
      account.password,
    );
  }

  console.log("\nGhi chú:");
  console.log("- Chỉ OWNER quản lý nhân viên, khách hàng, cài đặt và xem doanh thu.");
  console.log("- MANAGER: vận hành SP/đơn/marketing, không xem doanh thu.");
  console.log("- STAFF: xử lý đơn hàng + kho key.");
  console.log("- Đổi mật khẩu qua biến môi trường *_SEED_PASSWORD trong .env trước khi seed.\n");
}

seedAdmin()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error("Admin seed failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
