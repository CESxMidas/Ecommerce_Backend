import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

function assertResetAllowed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to reset database in production");
  }

  if (!process.argv.includes("--yes")) {
    throw new Error(
      "Refusing to reset without --yes. Example: npm run reset:db -- --yes",
    );
  }
}

async function resetDatabase() {
  assertResetAllowed();

  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required");
  }

  await mongoose.connect(process.env.MONGODB_URL);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log("Database is already empty.");
    await mongoose.disconnect();
    return;
  }

  for (const collection of collections) {
    await db.dropCollection(collection.name);
    console.log(`Dropped collection: ${collection.name}`);
  }

  await mongoose.disconnect();
  console.log("\nDatabase reset complete.");
  console.log("Next steps (optional):");
  console.log("  npm run seed:admin              # Tài khoản OWNER/MANAGER/STAFF");
  console.log("  npm run seed:catalog -- --yes   # Dữ liệu mẫu SP/danh mục (dev only)");
}

resetDatabase().catch(async (error) => {
  console.error("Reset failed:", error.message);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
