import express from "express";
import cookieParser from "cookie-parser";

import apiRoutes from "../../routes/index.js";
import { errorHandler, notFound } from "../../middleware/error.middleware.js";

/** Express app for integration tests (no listen, no rate limit). */
export function createTestApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use("/api", apiRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
