import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export async function connectDatabase() {
  if (!process.env.MONGODB_URL) {
    throw new Error("Please provide MONGODB_URL in the .env file");
  }

  await mongoose.connect(process.env.MONGODB_URL);
  console.log("MongoDB Connected");
}
