import OrderModel from "../models/order.model.js";
import ProductModel from "../models/product.model.js";
import UserModel from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { hasPermission } from "../utils/permissions.js";

export const adminGlobalSearch = asyncHandler(async (request, response) => {
  const query = String(request.query.q || "").trim();

  if (query.length < 2) {
    throw new ApiError(400, "Search query must be at least 2 characters");
  }

  const limit = Math.min(10, Math.max(1, Number(request.query.limit) || 5));
  const regex = { $regex: query, $options: "i" };
  const role = request.user.role;

  const searches = [
    hasPermission(role, "products.manage")
      ? ProductModel.find({
          $or: [{ name: regex }, { sku: regex }],
        })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .then((items) =>
            items.map((item) => ({
              type: "product",
              id: String(item.productId),
              title: item.name,
              subtitle: item.sku || `SP #${item.productId}`,
              href: `/products/${item.productId}/edit`,
            })),
          )
      : Promise.resolve([]),

    hasPermission(role, "orders.manage")
      ? OrderModel.find({
          $or: [
            { orderId: regex },
            { name: regex },
            { email: regex },
            { phone: regex },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(limit)
          .then((items) =>
            items.map((order) => ({
              type: "order",
              id: order.orderId,
              title: order.orderId,
              subtitle: `${order.name} · ${order.status}`,
              href: `/orders?search=${encodeURIComponent(order.orderId)}`,
            })),
          )
      : Promise.resolve([]),

    hasPermission(role, "customers.view")
      ? UserModel.find({
          role: "USER",
          $or: [{ name: regex }, { email: regex }, { mobile: regex }],
        })
          .sort({ createdAt: -1 })
          .limit(limit)
          .then((items) =>
            items.map((user) => ({
              type: "user",
              id: String(user._id),
              title: user.name || user.email,
              subtitle: user.email,
              href: `/users/${user._id}`,
            })),
          )
      : Promise.resolve([]),
  ];

  const [products, orders, users] = await Promise.all(searches);

  response.json({
    query,
    results: [...products, ...orders, ...users],
    groups: { products, orders, users },
  });
});
