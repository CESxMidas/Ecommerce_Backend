import dotenv from "dotenv";
import mongoose from "mongoose";

import ProductModel from "../models/product.model.js";
import AccountCredentialModel from "../models/accountCredential.model.js";
import {
  importAccountsToPool,
  isAccountPoolProduct,
} from "../utils/accountCredentialPool.js";

dotenv.config();

function buildSampleAccounts(product, count, startIndex = 1) {
  const slug = String(product.slug || product.sku || `product-${product.productId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return Array.from({ length: count }, (_, index) => {
    const serial = String(startIndex + index).padStart(4, "0");
    return {
      username: `demo+${slug}.${serial}@keyshop.local`,
      password: `Pro@${serial}!`,
      note: `Tài khoản demo ${product.name} #${serial}`,
    };
  });
}

export async function seedAccountCredentialPoolForProducts(products = []) {
  let importedTotal = 0;

  for (const product of products) {
    if (!isAccountPoolProduct(product)) {
      continue;
    }

    const existing = await AccountCredentialModel.countDocuments({
      productId: product.productId,
    });

    if (existing > 0) {
      continue;
    }

    const targetCount = Math.max(Number(product.stock) || 0, 0);

    if (targetCount === 0) {
      continue;
    }

    const accounts = buildSampleAccounts(product, targetCount);
    const result = await importAccountsToPool({
      productId: product.productId,
      accounts,
    });

    importedTotal += result.imported;
    console.log(
      `  Account pool ${product.productId} (${product.name}): ${result.imported} accounts`,
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
    productType: "account",
    deliveryType: "account_credentials",
  });

  const importedTotal = await seedAccountCredentialPoolForProducts(products);

  console.log(
    `Account credential pool seed complete (${importedTotal} accounts imported)`,
  );
}

const isDirectRun = process.argv[1]?.includes("seedAccountCredentialPool.js");

if (isDirectRun) {
  seedFromDatabase()
    .catch((error) => {
      console.error("Account credential pool seed failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
