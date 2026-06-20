import { Router } from "express";

import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/category.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/admin.middleware.js";

const router = Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);

router.post("/", protect, requirePermission("categories.manage"), createCategory);
router.put("/:id", protect, requirePermission("categories.manage"), updateCategory);
router.delete("/:id", protect, requirePermission("categories.manage"), deleteCategory);

export default router;
