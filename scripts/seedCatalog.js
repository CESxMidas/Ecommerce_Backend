import dotenv from "dotenv";
import mongoose from "mongoose";

import CategoryModel from "../models/category.model.js";
import ProductModel from "../models/product.model.js";
import CouponModel from "../models/coupon.model.js";
import BannerModel from "../models/banner.model.js";
import BlogModel from "../models/blog.model.js";
import ReviewModel from "../models/review.model.js";
import LicenseKeyModel from "../models/licenseKey.model.js";
import AccountCredentialModel from "../models/accountCredential.model.js";
import { PRODUCTION_CATEGORIES } from "../data/catalogCategories.js";
import {
  PRODUCTION_BANNERS,
  PRODUCTION_BLOGS,
  PRODUCTION_PRODUCTS,
} from "../data/productionProducts.js";
import { buildCategoryMap, normalizeSeedCategory, normalizeSeedProduct } from "../utils/dataNormalization.js";
import { seedLicenseKeyPoolForProducts } from "./seedLicenseKeyPool.js";
import { seedAccountCredentialPoolForProducts } from "./seedAccountCredentialPool.js";

dotenv.config();

function assertSeedAllowed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed catalog in production");
  }

  if (!process.argv.includes("--yes")) {
    throw new Error("Refusing to reset catalog without --yes");
  }
}

const categories = PRODUCTION_CATEGORIES.map((category) => ({
  id: category.categoryId,
  ...category,
}));

const coupons = [
  {
    code: "WELCOME10",
    type: "percent",
    value: 10,
    minOrder: 200000,
    maxDiscount: 200000,
    usageLimit: 200,
    expiresAt: new Date("2027-12-31T23:59:59.000Z"),
  },
  {
    code: "DIGITAL5",
    type: "fixed",
    value: 50000,
    minOrder: 250000,
    usageLimit: 150,
    expiresAt: new Date("2027-12-31T23:59:59.000Z"),
  },
  {
    code: "HARDWARE15",
    type: "percent",
    value: 15,
    minOrder: 1000000,
    maxDiscount: 1500000,
    usageLimit: 80,
    expiresAt: new Date("2027-12-31T23:59:59.000Z"),
  },
];

async function resetCollections() {
  await Promise.all([
    ProductModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    CouponModel.deleteMany({}),
    BannerModel.deleteMany({}),
    BlogModel.deleteMany({}),
    ReviewModel.deleteMany({}),
    LicenseKeyModel.deleteMany({}),
    AccountCredentialModel.deleteMany({}),
  ]);
}

async function seed() {
  assertSeedAllowed();

  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required");
  }

  await mongoose.connect(process.env.MONGODB_URL);

  console.log("Resetting catalog collections…");
  await resetCollections();

  const normalizedCategories = categories.map(normalizeSeedCategory);
  await CategoryModel.insertMany(normalizedCategories);

  const categoryMap = buildCategoryMap(normalizedCategories);
  const normalizedProducts = PRODUCTION_PRODUCTS.map((product) =>
    normalizeSeedProduct(product, categoryMap),
  );

  await ProductModel.insertMany(normalizedProducts);
  await CouponModel.insertMany(coupons);
  await BannerModel.insertMany(PRODUCTION_BANNERS);
  await BlogModel.insertMany(PRODUCTION_BLOGS);

  const insertedProducts = await ProductModel.find({
    productType: { $in: ["license_key", "redeem_code"] },
    deliveryType: "instant_key",
  });

  console.log("Importing license key pool (capped 30 keys/product for dev)…");
  const poolProducts = insertedProducts.map((product) => ({
    ...product.toObject(),
    stock: Math.min(Number(product.stock) || 0, 30),
  }));
  const poolImported = await seedLicenseKeyPoolForProducts(poolProducts);

  const accountProducts = await ProductModel.find({
    productType: "account",
    deliveryType: "account_credentials",
  });

  console.log("Importing account credential pool (capped 20 accounts/product for dev)…");
  const accountPoolProducts = accountProducts.map((product) => ({
    ...product.toObject(),
    stock: Math.min(Number(product.stock) || 0, 20),
  }));
  const accountPoolImported =
    await seedAccountCredentialPoolForProducts(accountPoolProducts);

  console.log("\n=== Production catalog seed complete ===\n");
  console.log(`Categories: ${normalizedCategories.length}`);
  console.log(`Products:   ${normalizedProducts.length}`);
  console.log(`Coupons:    ${coupons.length}`);
  console.log(`Banners:    ${PRODUCTION_BANNERS.length}`);
  console.log(`Blogs:      ${PRODUCTION_BLOGS.length}`);
  console.log(`Key pool:   ${poolImported} keys imported`);
  console.log(`Account pool: ${accountPoolImported} accounts imported\n`);
}

seed()
  .catch((error) => {
    console.error("Catalog seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
