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
  getProductAccountStats,
  importProductAccounts,
  listProductAccounts,
  revokeProductAccount,
} from "../controllers/admin.accountCredential.controller.js";
import {
  adminCreateStaff,
  adminGetStaff,
  adminResetStaffPassword,
  adminUpdateStaff,
} from "../controllers/admin.staff.controller.js";
import { getAnalyticsOverview } from "../controllers/admin.analytics.controller.js";
import { adminGetAuditLogs } from "../controllers/admin.audit.controller.js";
import { adminGetNotifications } from "../controllers/admin.notification.controller.js";
import {
  adminDeleteReview,
  adminGetProductReviews,
  adminUpdateReview,
} from "../controllers/admin.review.controller.js";
import { adminGlobalSearch } from "../controllers/admin.search.controller.js";
import {
  adminGetSiteSettings,
  adminUpdateSiteSettings,
} from "../controllers/admin.settings.controller.js";
import {
  adminGetTicketById,
  adminGetTickets,
  adminReplyTicket,
  adminUpdateTicket,
} from "../controllers/admin.ticket.controller.js";
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
import {
  requireAnyPermission,
  requirePermission,
  staffOnly,
} from "../middleware/admin.middleware.js";

const router = Router();

router.use(protect, staffOnly);

router.get("/stats", requirePermission("dashboard.view"), getDashboardStats);
router.get("/analytics/overview", requirePermission("reports.view"), getAnalyticsOverview);

router.get("/search", requirePermission("dashboard.view"), adminGlobalSearch);
router.get("/notifications", requirePermission("dashboard.view"), adminGetNotifications);
router.get("/audit", requirePermission("audit.view"), adminGetAuditLogs);

router.get("/tickets", requirePermission("tickets.manage"), adminGetTickets);
router.get("/tickets/:id", requirePermission("tickets.manage"), adminGetTicketById);
router.patch("/tickets/:id", requirePermission("tickets.manage"), adminUpdateTicket);
router.post("/tickets/:id/replies", requirePermission("tickets.manage"), adminReplyTicket);

router.patch("/reviews/:id", requirePermission("reviews.manage"), adminUpdateReview);
router.delete("/reviews/:id", requirePermission("reviews.manage"), adminDeleteReview);
router.get(
  "/products/:productId/reviews",
  requirePermission("reviews.manage"),
  adminGetProductReviews,
);

router.get("/settings", requirePermission("settings.manage"), adminGetSiteSettings);
router.patch("/settings", requirePermission("settings.manage"), adminUpdateSiteSettings);

router.get("/categories", requirePermission("categories.manage"), adminGetCategories);

router.get("/staff", requirePermission("staff.manage"), adminGetStaff);
router.post("/staff", requirePermission("staff.manage"), adminCreateStaff);
router.patch("/staff/:id", requirePermission("staff.manage"), adminUpdateStaff);
router.patch(
  "/staff/:id/password",
  requirePermission("staff.manage"),
  adminResetStaffPassword,
);

router.get("/users", requirePermission("customers.view"), adminGetUsers);
router.get("/users/:id", requirePermission("customers.view"), adminGetUserById);
router.patch("/users/:id", requirePermission("customers.manage"), adminUpdateUser);

router.get("/banners", requirePermission("banners.manage"), adminGetBanners);
router.post("/banners", requirePermission("banners.manage"), createBanner);
router.put("/banners/:id", requirePermission("banners.manage"), updateBanner);
router.delete("/banners/:id", requirePermission("banners.manage"), deleteBanner);

router.get("/blogs", requirePermission("blogs.manage"), adminGetBlogs);
router.post("/blogs", requirePermission("blogs.manage"), createBlog);
router.put("/blogs/:id", requirePermission("blogs.manage"), updateBlog);
router.delete("/blogs/:id", requirePermission("blogs.manage"), deleteBlog);

router.post(
  "/upload",
  requireAnyPermission(
    "products.manage",
    "categories.manage",
    "banners.manage",
    "blogs.manage",
    "settings.manage",
  ),
  uploadMiddleware,
  uploadImage,
);

router.get("/products", requirePermission("products.manage"), adminGetProducts);
router.get(
  "/products/:productId/keys/stats",
  requirePermission("keys.manage"),
  getProductKeyStats,
);
router.get(
  "/products/:productId/keys",
  requirePermission("keys.manage"),
  listProductKeys,
);
router.post(
  "/products/:productId/keys/import",
  requirePermission("keys.manage"),
  importProductKeys,
);
router.delete(
  "/products/:productId/keys/:keyId",
  requirePermission("keys.manage"),
  revokeProductKey,
);

router.get(
  "/products/:productId/accounts/stats",
  requirePermission("keys.manage"),
  getProductAccountStats,
);
router.get(
  "/products/:productId/accounts",
  requirePermission("keys.manage"),
  listProductAccounts,
);
router.post(
  "/products/:productId/accounts/import",
  requirePermission("keys.manage"),
  importProductAccounts,
);
router.delete(
  "/products/:productId/accounts/:accountId",
  requirePermission("keys.manage"),
  revokeProductAccount,
);

export default router;
