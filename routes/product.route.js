import { Router } from "express";

import {
  createProduct,
  createProductReview,
  deleteProduct,
  getProductById,
  getProductReviews,
  getProducts,
  hardDeleteProduct,
  updateProduct,
} from "../controllers/product.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/admin.middleware.js";

const router = Router();

router.get("/", getProducts);
router.get("/:id/reviews", getProductReviews);
router.post("/:id/reviews", protect, createProductReview);
router.get("/:id", getProductById);

router.post("/", protect, requirePermission("products.manage"), createProduct);
router.put("/:id", protect, requirePermission("products.manage"), updateProduct);
router.delete("/:id/hard", protect, requirePermission("products.manage"), hardDeleteProduct);
router.delete("/:id", protect, requirePermission("products.manage"), deleteProduct);

export default router;
