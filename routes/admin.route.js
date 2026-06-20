import { Router } from "express";

import {
  adminGetBanners,
  createBanner,
  deleteBanner,
  updateBanner,
} from "../controllers/banner.controller.js";
import {
  adminGetBlogs,
  createBlog,
  deleteBlog,
  updateBlog,
} from "../controllers/blog.controller.js";
import { adminGetCategories } from "../controllers/category.controller.js";
import {
  getProductKeyStats,
  importProductKeys,
  listProductKeys,
  revokeProductKey,
} from "../controllers/admin.licenseKey.controller.js";
import {
  adminGetUserById,
  adminGetUsers,
  adminUpdateUser,
} from "../controllers/admin.user.controller.js";
import { getDashboardStats } from "../controllers/admin.controller.js";
import { adminGetProducts } from "../controllers/product.controller.js";
import {
  uploadImage,
  uploadMiddleware,
} from "../controllers/upload.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/admin.middleware.js";

const router = Router();

router.use(protect, adminOnly);

router.get("/stats", getDashboardStats);

router.get("/categories", adminGetCategories);

router.get("/users", adminGetUsers);
router.get("/users/:id", adminGetUserById);
router.patch("/users/:id", adminUpdateUser);

router.get("/banners", adminGetBanners);
router.post("/banners", createBanner);
router.put("/banners/:id", updateBanner);
router.delete("/banners/:id", deleteBanner);

router.get("/blogs", adminGetBlogs);
router.post("/blogs", createBlog);
router.put("/blogs/:id", updateBlog);
router.delete("/blogs/:id", deleteBlog);

router.post("/upload", uploadMiddleware, uploadImage);

router.get("/products", adminGetProducts);
router.get("/products/:productId/keys/stats", getProductKeyStats);
router.get("/products/:productId/keys", listProductKeys);
router.post("/products/:productId/keys/import", importProductKeys);
router.delete("/products/:productId/keys/:keyId", revokeProductKey);

export default router;
