import UserModel from "../models/user.model.js";
import OrderModel from "../models/order.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { formatAdminUser, formatAdminUserDetail, formatOrder } from "../utils/formatters.js";
import { ApiError } from "../utils/apiError.js";

async function getOrderCountMap(emails) {
  if (!emails.length) {
    return {};
  }

  const rows = await OrderModel.aggregate([
    { $match: { email: { $in: emails } } },
    { $group: { _id: "$email", count: { $sum: 1 } } },
  ]);

  return rows.reduce((map, row) => {
    map[row._id] = row.count;
    return map;
  }, {});
}

async function assertCanChangeAdmin(user, nextRole, nextStatus) {
  const becomesNonAdmin =
    (nextRole != null && nextRole !== "ADMIN") ||
    (nextStatus != null && nextStatus !== "Active");

  if (user.role !== "ADMIN" || !becomesNonAdmin) {
    return;
  }

  const activeAdminCount = await UserModel.countDocuments({
    role: "ADMIN",
    status: "Active",
  });

  if (activeAdminCount <= 1 && user.status === "Active") {
    throw new ApiError(400, "Cannot modify the last active admin account");
  }
}

export const adminGetUsers = asyncHandler(async (request, response) => {
  const users = await UserModel.find({})
    .sort({ createdAt: -1 })
    .select(
      "-password -forgot_password_otp -email_change_otp_hash -email_change_new",
    );

  const countMap = await getOrderCountMap(
    users.map((user) => user.email).filter(Boolean),
  );

  response.json(
    users.map((user) => formatAdminUser(user, countMap[user.email] || 0)),
  );
});

export const adminUpdateUser = asyncHandler(async (request, response) => {
  const user = await UserModel.findById(request.params.id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { role, status } = request.body;

  if (String(user._id) === String(request.user._id)) {
    if (role != null && role !== user.role) {
      throw new ApiError(400, "Cannot change your own role");
    }

    if (status != null && status !== user.status) {
      throw new ApiError(400, "Cannot change your own account status");
    }
  }

  if (role != null) {
    if (!["ADMIN", "USER"].includes(role)) {
      throw new ApiError(400, "Invalid role");
    }

    await assertCanChangeAdmin(user, role, status ?? user.status);
    user.role = role;
  }

  if (status != null) {
    if (!["Active", "Inactive", "Suspended"].includes(status)) {
      throw new ApiError(400, "Invalid status");
    }

    await assertCanChangeAdmin(user, role ?? user.role, status);
    user.status = status;
  }

  if (role == null && status == null) {
    throw new ApiError(400, "No valid user fields to update");
  }

  await user.save();

  const orderCount = await OrderModel.countDocuments({ email: user.email });
  response.json(formatAdminUser(user, orderCount));
});

export const adminGetUserById = asyncHandler(async (request, response) => {
  const user = await UserModel.findById(request.params.id).select(
    "-password -forgot_password_otp -email_change_otp_hash -email_change_new",
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const email = user.email;

  const [orderCount, orders, paidCount, spentAgg] = await Promise.all([
    OrderModel.countDocuments({ email }),
    OrderModel.find({ email }).sort({ createdAt: -1 }).limit(20),
    OrderModel.countDocuments({ email, paymentStatus: "paid" }),
    OrderModel.aggregate([
      { $match: { email, paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
  ]);

  response.json({
    user: formatAdminUserDetail(user, orderCount),
    orders: orders.map(formatOrder),
    orderStats: {
      total: orderCount,
      paid: paidCount,
      totalSpent: spentAgg[0]?.total || 0,
    },
  });
});
