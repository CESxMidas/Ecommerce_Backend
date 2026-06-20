import OrderModel from "../models/order.model.js";
import ProductModel from "../models/product.model.js";
import TicketModel from "../models/ticket.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hasPermission } from "../utils/permissions.js";

export const adminGetNotifications = asyncHandler(async (request, response) => {
  const role = request.user.role;
  const alerts = [];

  if (hasPermission(role, "orders.manage")) {
    const [pendingPayment, processing] = await Promise.all([
      OrderModel.countDocuments({ status: "PendingPayment" }),
      OrderModel.countDocuments({ status: "Processing" }),
    ]);

    if (pendingPayment > 0) {
      alerts.push({
        id: "orders-pending-payment",
        type: "order",
        title: "Đơn chờ thanh toán",
        message: `${pendingPayment} đơn đang chờ thanh toán`,
        href: "/orders?status=PendingPayment&view=kanban",
        count: pendingPayment,
      });
    }

    if (processing > 0) {
      alerts.push({
        id: "orders-processing",
        type: "order",
        title: "Đơn cần xử lý",
        message: `${processing} đơn đang xử lý`,
        href: "/orders?status=Processing&view=kanban",
        count: processing,
      });
    }
  }

  if (hasPermission(role, "tickets.manage")) {
    const openTickets = await TicketModel.countDocuments({
      status: { $in: ["open", "pending"] },
    });

    if (openTickets > 0) {
      alerts.push({
        id: "tickets-open",
        type: "ticket",
        title: "Ticket hỗ trợ",
        message: `${openTickets} ticket đang mở hoặc chờ phản hồi`,
        href: "/tickets?status=open",
        count: openTickets,
      });
    }
  }

  if (hasPermission(role, "products.manage")) {
    const lowStock = await ProductModel.countDocuments({
      isActive: true,
      stock: { $lte: 5 },
    });

    if (lowStock > 0) {
      alerts.push({
        id: "products-low-stock",
        type: "product",
        title: "Sắp hết hàng",
        message: `${lowStock} sản phẩm có tồn kho ≤ 5`,
        href: "/products",
        count: lowStock,
      });
    }
  }

  response.json({
    alerts,
    unreadCount: alerts.length,
  });
});
