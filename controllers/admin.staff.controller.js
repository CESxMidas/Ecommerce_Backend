import bcrypt from "bcryptjs";

import UserModel from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { formatAdminStaff } from "../utils/formatters.js";
import { ApiError } from "../utils/apiError.js";
import {
  ASSIGNABLE_STAFF_ROLES,
  INTERNAL_STAFF_ROLES,
  isOwnerRole,
  OWNER_ROLES,
} from "../utils/permissions.js";

async function assertCanModifyStaffAccount(target, nextRole, nextStatus) {
  const becomesNonOwner =
    (nextRole != null && !OWNER_ROLES.includes(nextRole)) ||
    (nextStatus != null && nextStatus !== "Active");

  if (!isOwnerRole(target.role) || !becomesNonOwner) {
    return;
  }

  const activeOwnerCount = await UserModel.countDocuments({
    role: { $in: OWNER_ROLES },
    status: "Active",
  });

  if (activeOwnerCount <= 1 && target.status === "Active") {
    throw new ApiError(400, "Cannot modify the last active owner account");
  }
}

export const adminGetStaff = asyncHandler(async (request, response) => {
  const staff = await UserModel.find({
    role: { $in: INTERNAL_STAFF_ROLES },
  })
    .sort({ createdAt: -1 })
    .select(
      "-password -forgot_password_otp -email_change_otp_hash -email_change_new",
    );

  response.json(staff.map((user) => formatAdminStaff(user)));
});

export const adminCreateStaff = asyncHandler(async (request, response) => {
  const name = String(request.body.name || "").trim();
  const email = String(request.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(request.body.password || "");
  const role = request.body.role;

  if (!name) {
    throw new ApiError(400, "Name is required");
  }

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  if (!ASSIGNABLE_STAFF_ROLES.includes(role)) {
    throw new ApiError(400, "Role must be MANAGER or STAFF");
  }

  const existing = await UserModel.findOne({ email });

  if (existing) {
    throw new ApiError(409, "Email already registered");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await UserModel.create({
    name,
    email,
    password: passwordHash,
    role,
    verify_email: true,
    status: "Active",
    authProvider: "local",
  });

  response.status(201).json(formatAdminStaff(user));
});

export const adminUpdateStaff = asyncHandler(async (request, response) => {
  const staff = await UserModel.findById(request.params.id);

  if (!staff || !INTERNAL_STAFF_ROLES.includes(staff.role)) {
    throw new ApiError(404, "Staff member not found");
  }

  const { name, role, status } = request.body;

  if (String(staff._id) === String(request.user._id)) {
    if (role != null && role !== staff.role) {
      throw new ApiError(400, "Cannot change your own role");
    }

    if (status != null && status !== staff.status) {
      throw new ApiError(400, "Cannot change your own account status");
    }
  }

  if (isOwnerRole(staff.role) && role != null && role !== staff.role) {
    throw new ApiError(400, "Cannot change owner role");
  }

  if (name != null) {
    const trimmedName = String(name).trim();
    if (!trimmedName) {
      throw new ApiError(400, "Name is required");
    }

    staff.name = trimmedName;
  }

  if (role != null) {
    if (!ASSIGNABLE_STAFF_ROLES.includes(role)) {
      throw new ApiError(400, "Role must be MANAGER or STAFF");
    }

    await assertCanModifyStaffAccount(staff, role, status ?? staff.status);
    staff.role = role;
  }

  if (status != null) {
    if (!["Active", "Inactive", "Suspended"].includes(status)) {
      throw new ApiError(400, "Invalid status");
    }

    await assertCanModifyStaffAccount(staff, role ?? staff.role, status);
    staff.status = status;
  }

  if (name == null && role == null && status == null) {
    throw new ApiError(400, "No valid staff fields to update");
  }

  await staff.save();
  response.json(formatAdminStaff(staff));
});

export const adminResetStaffPassword = asyncHandler(async (request, response) => {
  const password = String(request.body.password || "");

  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  const staff = await UserModel.findById(request.params.id).select("+password");

  if (!staff || !INTERNAL_STAFF_ROLES.includes(staff.role)) {
    throw new ApiError(404, "Staff member not found");
  }

  if (String(staff._id) === String(request.user._id)) {
    throw new ApiError(400, "Use profile settings to change your own password");
  }

  staff.password = await bcrypt.hash(password, 10);
  staff.lastPasswordChangeAt = new Date();
  await staff.save();

  response.json({ message: "Password updated" });
});
