import { Router } from "express";

import {
  createProduct,
  createProductReview,
  deleteProduct,
  getProductById,
  getProductReviews,
  getProducts,
  updateProduct,
} from "../controllers/product.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/admin.middleware.js";

const router = Router();

router.get("/", getProducts);
router.get("/:id/reviews", getProductReviews);
router.post("/:id/reviews", protect, createProductReview);
router.get("/:id", getProductById);

router.post("/", protect, adminOnly, createProduct);
router.put("/:id", protect, adminOnly, updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

export default router;
