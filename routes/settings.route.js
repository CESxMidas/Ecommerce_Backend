import { Router } from "express";

import { getPublicSiteSettings } from "../controllers/admin.settings.controller.js";

const router = Router();

router.get("/", getPublicSiteSettings);

export default router;
