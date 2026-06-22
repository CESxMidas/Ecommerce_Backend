import "dotenv/config";

import mongoose from "mongoose";

import CategoryModel from "../models/category.model.js";
import ProductModel from "../models/product.model.js";
import {
  CATEGORY_NAME_BY_ID,
  LEGACY_CATEGORY_IDS,
  LEGACY_CATEGORY_REMAP,
  PRODUCTION_CATEGORIES,
} from "../data/catalogCategories.js";

async function remapProducts() {
  let remapped = 0;
  let deactivated = 0;

  for (const [legacyId, nextId] of Object.entries(LEGACY_CATEGORY_REMAP)) {
    const fromId = Number(legacyId);

    if (nextId == null) {
      const result = await ProductModel.updateMany(
        { categoryId: fromId },
        { $set: { isActive: false } },
      );
      deactivated += result.modifiedCount;
      console.log(
        `Deactivated ${result.modifiedCount} product(s) in legacy category ${fromId}`,
      );
      continue;
    }

    const categoryName = CATEGORY_NAME_BY_ID.get(nextId) || "";

    const result = await ProductModel.updateMany(
      { categoryId: fromId },
      { $set: { categoryId: nextId, categoryName } },
    );

    remapped += result.modifiedCount;

    if (result.modifiedCount > 0) {
      console.log(
        `Remapped ${result.modifiedCount} product(s): category ${fromId} → ${nextId}`,
      );
    }
  }

  return { remapped, deactivated };
}

async function deactivateLegacyCategories() {
  const result = await CategoryModel.updateMany(
    { categoryId: { $in: LEGACY_CATEGORY_IDS } },
    { $set: { isActive: false } },
  );

  console.log(`Deactivated ${result.modifiedCount} legacy categor(ies)`);
}

async function upsertProductionCategories() {
  for (const category of PRODUCTION_CATEGORIES) {
    await CategoryModel.updateOne(
      { categoryId: category.categoryId },
      { $set: category },
      { upsert: true },
    );

    console.log(`Upserted category ${category.categoryId}: ${category.name}`);
  }
}

async function migrateCategoriesV2() {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required");
  }

  await mongoose.connect(process.env.MONGODB_URL);

  console.log("\n=== Category migration V2 ===\n");

  const { remapped, deactivated } = await remapProducts();
  await deactivateLegacyCategories();
  await upsertProductionCategories();

  const roots = await CategoryModel.find({ parentId: null, isActive: true })
    .sort({ sortOrder: 1 })
    .select("categoryId name slug sortOrder");

  console.log("\n=== 2 danh mục gốc hiện tại ===\n");
  roots.forEach((category) => {
    console.log(`${category.sortOrder}. ${category.name} (${category.slug}) [id=${category.categoryId}]`);
  });

  const children = await CategoryModel.find({ parentId: { $ne: null }, isActive: true })
    .sort({ parentId: 1, sortOrder: 1 })
    .select("categoryId name slug parentId");

  console.log("\n=== Danh mục con ===\n");
  children.forEach((category) => {
    console.log(`  ${category.parentId} → ${category.name} (${category.slug}) [id=${category.categoryId}]`);
  });

  console.log(
    `\nDone. Products remapped: ${remapped}, deactivated: ${deactivated}\n`,
  );
}

migrateCategoriesV2()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error("Category migration V2 failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
