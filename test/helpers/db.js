import mongoose from "mongoose";

import UserModel from "../../models/user.model.js";
import ProductModel from "../../models/product.model.js";
import CartModel from "../../models/cart.model.js";
import OrderModel from "../../models/order.model.js";
import PaymentModel from "../../models/payment.model.js";
import bcrypt from "bcryptjs";

import { TEST_PRODUCTS, TEST_USER } from "./fixtures.js";

export function getTestMongoUrl() {
  return process.env.TEST_MONGODB_URL || process.env.MONGODB_URL;
}

export async function connectTestDb() {
  const url = getTestMongoUrl();

  if (!url) {
    throw new Error("TEST_MONGODB_URL or MONGODB_URL is required for integration tests");
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(url);
  }

  return url;
}

export async function disconnectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export async function seedTestData() {
  const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);

  const user = await UserModel.findOneAndUpdate(
    { email: TEST_USER.email },
    {
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: hashedPassword,
      verify_email: true,
      status: "Active",
      role: "USER",
      authProvider: "local",
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  for (const product of [TEST_PRODUCTS.digital, TEST_PRODUCTS.physical]) {
    await ProductModel.findOneAndUpdate(
      { productId: product.productId },
      { $set: product },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  await CartModel.deleteMany({ user: user._id });

  return { user };
}

export async function cleanupTestData() {
  const user = await UserModel.findOne({ email: TEST_USER.email });

  if (user) {
    await CartModel.deleteMany({ user: user._id });
  }

  await Promise.all([
    OrderModel.deleteMany({ email: TEST_USER.email }),
    PaymentModel.deleteMany({}),
  ]);
}
