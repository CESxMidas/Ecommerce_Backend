import "dotenv/config";

import mongoose from "mongoose";

import CategoryModel from "../models/category.model.js";

const ROOT_UPDATES = [
  {
    categoryId: 1,
    name: "Key / Mã bản quyền",
    slug: "license-keys",
    description: "Key phần mềm và mã nạp — giao tức thì sau thanh toán",
    parentId: null,
    sortOrder: 1,
  },
  {
    categoryId: 13,
    name: "Tài khoản Pro",
    slug: "accounts-pro",
    description: "Canva, Office 365, Netflix Pro — giao thông tin đăng nhập",
    parentId: null,
    sortOrder: 2,
  },
  {
    categoryId: 2,
    name: "Phần cứng",
    slug: "hardware",
    sortOrder: 3,
  },
];

const CHILD_UPDATES = [
  {
    categoryId: 11,
    slug: "software-keys",
    parentId: 1,
    sortOrder: 1,
  },
  {
    categoryId: 12,
    parentId: 1,
    sortOrder: 2,
  },
  {
    categoryId: 14,
    name: "Dịch vụ hỗ trợ",
    parentId: 13,
    sortOrder: 1,
  },
  {
    categoryId: 21,
    parentId: 2,
    sortOrder: 1,
  },
  {
    categoryId: 22,
    parentId: 2,
    sortOrder: 2,
  },
  {
    categoryId: 23,
    parentId: 2,
    sortOrder: 3,
  },
];

async function migrateCategories() {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required");
  }

  await mongoose.connect(process.env.MONGODB_URL);

  // Resolve slug conflicts before promoting roots.
  for (const update of CHILD_UPDATES) {
    const { categoryId, ...fields } = update;
    const result = await CategoryModel.updateOne({ categoryId }, { $set: fields });

    console.log(
      result.matchedCount
        ? `Updated child category ${categoryId}`
        : `Skipped missing child category ${categoryId}`,
    );
  }

  for (const update of ROOT_UPDATES) {
    const { categoryId, ...fields } = update;
    const result = await CategoryModel.updateOne({ categoryId }, { $set: fields });

    console.log(
      result.matchedCount
        ? `Updated root category ${categoryId} → ${fields.name || categoryId}`
        : `Skipped missing category ${categoryId}`,
    );
  }

  const roots = await CategoryModel.find({ parentId: null })
    .sort({ sortOrder: 1 })
    .select("categoryId name slug sortOrder");

  console.log("\n=== 3 danh mục gốc hiện tại ===\n");
  roots.forEach((category) => {
    console.log(`${category.sortOrder}. ${category.name} (${category.slug})`);
  });
  console.log("");
}

migrateCategories()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error("Category migration failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
