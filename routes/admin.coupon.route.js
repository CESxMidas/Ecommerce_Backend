import { Router } from "express";

import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
} from "../controllers/coupon.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import {
  requirePermission,
  staffOnly,
} from "../middleware/admin.middleware.js";

const router = Router();

router.use(protect, staffOnly);

router.get("/", requirePermission("coupons.manage"), getCoupons);
router.post("/", requirePermission("coupons.manage"), createCoupon);
router.put("/:id", requirePermission("coupons.manage"), updateCoupon);
router.delete("/:id", requirePermission("coupons.manage"), deleteCoupon);

export default router;
