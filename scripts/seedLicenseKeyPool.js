import dotenv from "dotenv";
import mongoose from "mongoose";

import ProductModel from "../models/product.model.js";
import LicenseKeyModel from "../models/licenseKey.model.js";
import { importKeysToPool, isPoolProduct } from "../utils/licenseKeyPool.js";

dotenv.config();

function buildSampleKeys(prefix, count, startIndex = 1) {
  const normalizedPrefix = String(prefix || "KEY")
    .trim()
    .toUpperCase();

  return Array.from({ length: count }, (_, index) => {
    const serial = String(startIndex + index).padStart(5, "0");
    return `${normalizedPrefix}-${serial}`;
  });
}

export async function seedLicenseKeyPoolForProducts(products = []) {
  let importedTotal = 0;

  for (const product of products) {
    if (!isPoolProduct(product)) {
      continue;
    }

    const existing = await LicenseKeyModel.countDocuments({
      productId: product.productId,
    });

    if (existing > 0) {
      continue;
    }

    const targetCount = Math.max(Number(product.stock) || 0, 0);

    if (targetCount === 0) {
      continue;
    }

    const keys = buildSampleKeys(product.keyPrefix, targetCount);
    const result = await importKeysToPool({
      productId: product.productId,
      keys,
    });

    importedTotal += result.imported;
    console.log(
      `  Pool ${product.productId} (${product.name}): ${result.imported} keys`,
    );
  }

  return importedTotal;
}

async function seedFromDatabase() {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required");
  }

  await mongoose.connect(process.env.MONGODB_URL);

  const products = await ProductModel.find({
    productType: { $in: ["license_key", "redeem_code"] },
    deliveryType: "instant_key",
  });

  const importedTotal = await seedLicenseKeyPoolForProducts(products);

  console.log(`License key pool seed complete (${importedTotal} keys imported)`);
}

const isDirectRun = process.argv[1]?.includes("seedLicenseKeyPool.js");

if (isDirectRun) {
  seedFromDatabase()
    .catch((error) => {
      console.error("License key pool seed failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
