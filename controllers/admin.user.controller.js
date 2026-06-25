import UserModel from "../models/user.model.js";
import OrderModel from "../models/order.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { formatAdminUser, formatAdminUserDetail, formatOrder } from "../utils/formatters.js";
import { ApiError } from "../utils/apiError.js";
import { writeAuditLog } from "../utils/auditLog.js";

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

async function assertCanChangeOwner(user, nextRole, nextStatus) {
  const becomesNonOwner =
    (nextRole != null && !OWNER_ROLES.includes(nextRole)) ||
    (nextStatus != null && nextStatus !== "Active");

  if (!isOwnerRole(user.role) || !becomesNonOwner) {
    return;
  }

  const activeOwnerCount = await UserModel.countDocuments({
    role: { $in: OWNER_ROLES },
    status: "Active",
  });

  if (activeOwnerCount <= 1 && user.status === "Active") {
    throw new ApiError(400, "Cannot modify the last active owner account");
  }
}

export const adminGetUsers = asyncHandler(async (request, response) => {
  const users = await UserModel.find({ role: "USER" })
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

  if (!user || user.role !== "USER") {
    throw new ApiError(404, "User not found");
  }

  const { status } = request.body;

  if (String(user._id) === String(request.user._id)) {
    if (status != null && status !== user.status) {
      throw new ApiError(400, "Cannot change your own account status");
    }
  }

  if (status != null) {
    if (!["Active", "Inactive", "Suspended"].includes(status)) {
      throw new ApiError(400, "Invalid status");
    }

    user.status = status;
  }

  if (status == null) {
    throw new ApiError(400, "No valid user fields to update");
  }

  await user.save();

  await writeAuditLog({
    actor: request.user,
    action: "customer.update",
    entityType: "customer",
    entityId: user._id,
    summary: `Cập nhật khách hàng ${user.name || user.email} — trạng thái ${user.status}`,
    metadata: { status: user.status },
  });

  const orderCount = await OrderModel.countDocuments({ email: user.email });
  response.json(formatAdminUser(user, orderCount));
});

export const adminGetUserById = asyncHandler(async (request, response) => {
  const user = await UserModel.findById(request.params.id).select(
    "-password -forgot_password_otp -email_change_otp_hash -email_change_new",
  );

  if (!user || user.role !== "USER") {
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
