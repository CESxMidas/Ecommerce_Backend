import { Router } from "express";

import {
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
} from "../controllers/order.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/admin.middleware.js";

const router = Router();

router.use(protect);

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.patch("/:id", protect, adminOnly, updateOrderStatus);

export default router;
