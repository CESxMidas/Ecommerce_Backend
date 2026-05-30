import { Router } from "express";

import {
  changePassword,
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
  updateProfile,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

router.patch("/profile", updateProfile);
router.post("/profile/password", changePassword);

router.get("/addresses", getAddresses);
router.post("/addresses", createAddress);
router.patch("/addresses/:id", updateAddress);
router.delete("/addresses/:id", deleteAddress);

export default router;
