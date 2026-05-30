import { Router } from "express";

import authRoutes from "./auth.route.js";
import productRoutes from "./product.route.js";
import categoryRoutes from "./category.route.js";
import cartRoutes from "./cart.route.js";
import orderRoutes from "./order.route.js";
import userRoutes from "./user.route.js";

const router = Router();

router.get("/health", (request, response) => {
  response.json({ ok: true });
});

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/user", userRoutes);

export default router;
