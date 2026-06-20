// Giữ nguyên file này như cũ của bạn
import { Router } from "express";
import {
  createOrder,
  cancelOrder,
  getOrderById,
  getOrders,
  hideOrder,
  trackOrder,
  updateOrderStatus,
} from "../controllers/order.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/admin.middleware.js";

const router = Router();

router.post("/track", trackOrder);

router.use(protect);

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.patch("/:id/cancel", cancelOrder);
router.patch("/:id/hide", hideOrder);
router.patch("/:id", protect, requirePermission("orders.manage"), updateOrderStatus);

export default router;
