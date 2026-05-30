import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

import ProductModel from "../models/product.model.js";
import CategoryModel from "../models/category.model.js";
import UserModel from "../models/user.model.js";
import {
  buildCategoryMap,
  dedupeProductsByKey,
  normalizeSeedCategory,
  normalizeSeedProduct,
} from "./dataNormalization.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadJson(relativePath) {
  const jsonPath = path.resolve(__dirname, relativePath);

  if (!fs.existsSync(jsonPath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
}

function loadCategoriesFromSeedFile() {
  return loadJson("../data/categories.json");
}

function loadProductsFromSeedFile() {
  return loadJson("../data/products.json");
}

async function syncCategories(categories) {
  if (categories.length === 0) {
    return buildCategoryMap([]);
  }

  for (const raw of categories) {
    const category = normalizeSeedCategory(raw);

    await CategoryModel.findOneAndUpdate(
      { categoryId: category.categoryId },
      category,
      { upsert: true, new: true },
    );
  }

  console.log(`Synced ${categories.length} categories`);

  return buildCategoryMap(categories);
}

async function syncProducts(products, categoryMap) {
  const normalized = dedupeProductsByKey(
    products.map((item) => normalizeSeedProduct(item, categoryMap)),
    (item) => item.productId,
  );

  if (normalized.length === 0) {
    return;
  }

  const productCount = await ProductModel.countDocuments();

  if (productCount === 0) {
    await ProductModel.insertMany(normalized);
    console.log(`Seeded ${normalized.length} products`);
    return;
  }

  for (const product of normalized) {
    await ProductModel.findOneAndUpdate(
      { productId: product.productId },
      { $set: product },
      { upsert: true, new: true },
    );
  }

  const seedIds = normalized.map((item) => item.productId);
  await ProductModel.updateMany(
    { productId: { $nin: seedIds } },
    { $set: { isActive: false } },
  );

  console.log(`Synced ${normalized.length} products (schema normalized)`);
}

export async function seedDatabase() {
  const categories = loadCategoriesFromSeedFile();
  const categoryMap = await syncCategories(categories);

  const products = loadProductsFromSeedFile();
  await syncProducts(products, categoryMap);

  const adminEmail = "admin@ecommerce.com";
  const adminExists = await UserModel.findOne({ email: adminEmail });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    await UserModel.create({
      name: "Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
      verify_email: true,
    });

    console.log("Seeded admin user: admin@ecommerce.com / admin123");
  }
}
