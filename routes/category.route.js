import { Router } from "express";

import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/category.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/admin.middleware.js";

const router = Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);

router.post("/", protect, adminOnly, createCategory);
router.put("/:id", protect, adminOnly, updateCategory);
router.delete("/:id", protect, adminOnly, deleteCategory);

export default router;
