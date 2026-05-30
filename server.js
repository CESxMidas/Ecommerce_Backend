import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";

import { connectDatabase } from "./config/database.js";
import { verifyEmailConnection } from "./utils/email.js";
import { getGoogleClientIds } from "./utils/googleAuth.js";
import { seedDatabase } from "./utils/seedData.js";
import apiRoutes from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 888;
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

app.get("/", (request, response) => {
  response.json({
    message: "E-commerce API is running",
    port: PORT,
    docs: "/api/health",
  });
});

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  await connectDatabase();
  await seedDatabase();
  await verifyEmailConnection();

  const googleIds = getGoogleClientIds();

  if (googleIds.length > 0) {
    console.log(
      `[Google Auth] Client ID: ${googleIds[0].slice(0, 12)}...`,
    );
  } else {
    console.warn("[Google Auth] GOOGLE_CLIENT_ID chưa cấu hình");
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
