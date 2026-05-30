import { Router } from "express";

import {
  addToCart,
  getCart,
  removeCartItem,
  replaceCart,
  updateCartItem,
} from "../controllers/cart.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/", getCart);
router.post("/", addToCart);
router.put("/", replaceCart);
router.put("/:id", updateCartItem);
router.delete("/:id", removeCartItem);

export default router;
