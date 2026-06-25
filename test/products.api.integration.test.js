import "./helpers/setupEnv.js";
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createTestApp } from "./helpers/testApp.js";
import {
  cleanupTestData,
  connectTestDb,
  disconnectTestDb,
  getTestMongoUrl,
  seedTestData,
} from "./helpers/db.js";
import { TEST_PRODUCTS } from "./helpers/fixtures.js";

const mongoUrl = getTestMongoUrl();
const app = createTestApp();

test.describe("Products API integration", { skip: !mongoUrl }, () => {
  test.before(async () => {
    await connectTestDb();
    await seedTestData();
  });

  test.after(async () => {
    await cleanupTestData();
    await disconnectTestDb();
  });

  test("GET /products returns a paginated list", async () => {
    const response = await request(app).get("/api/products").query({ limit: 5 });

    assert.equal(response.status, 200);
    const products = response.body.items || response.body;
    assert.ok(Array.isArray(products));
    assert.ok(products.length >= 1);
  });

  test("GET /products search by query returns matching product", async () => {
    const response = await request(app)
      .get("/api/products")
      .query({ q: "QA Windows Key", limit: 10 });

    assert.equal(response.status, 200);
    const products = response.body.items || response.body;
    assert.ok(products.some((item) => item.id === TEST_PRODUCTS.digital.productId));
  });

  test("GET /products/:id returns product detail", async () => {
    const response = await request(app).get(
      `/api/products/${TEST_PRODUCTS.digital.productId}`,
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.id, TEST_PRODUCTS.digital.productId);
    assert.match(response.body.name, /QA Windows/i);
  });

  test("GET /products/:id returns 404 for missing product", async () => {
    const response = await request(app).get("/api/products/999999999");
    assert.equal(response.status, 404);
  });
});
