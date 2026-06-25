import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret-keyshop-qa";
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}
