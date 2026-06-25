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
import { TEST_PRODUCTS, TEST_USER } from "./helpers/fixtures.js";

const mongoUrl = getTestMongoUrl();
const app = createTestApp();

async function loginAndGetToken() {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email: TEST_USER.email, password: TEST_USER.password });

  return response.body.token;
}

test.describe("Cart API integration", { skip: !mongoUrl }, () => {
  test.before(async () => {
    await connectTestDb();
    await seedTestData();
  });

  test.after(async () => {
    await cleanupTestData();
    await disconnectTestDb();
  });

  test("GET /cart returns 401 when not logged in", async () => {
    const response = await request(app).get("/api/cart");
    assert.equal(response.status, 401);
  });

  test("add, update quantity, and remove cart item", async () => {
    const token = await loginAndGetToken();
    const auth = { Authorization: `Bearer ${token}` };

    const addResponse = await request(app)
      .post("/api/cart")
      .set(auth)
      .send({ productId: TEST_PRODUCTS.digital.productId, quantity: 1 });

    assert.equal(addResponse.status, 201);
    assert.equal(addResponse.body.length, 1);
    assert.equal(addResponse.body[0].quantity, 1);

    const updateResponse = await request(app)
      .put(`/api/cart/${TEST_PRODUCTS.digital.productId}`)
      .set(auth)
      .send({ quantity: 3 });

    assert.equal(updateResponse.status, 200);
    assert.equal(updateResponse.body[0].quantity, 3);

    const unitPrice =
      updateResponse.body[0].product?.salePrice ??
      updateResponse.body[0].product?.price ??
      0;
    const lineTotal = unitPrice * 3;
    assert.ok(lineTotal > 0, "cart line should have positive total");

    const deleteResponse = await request(app)
      .delete(`/api/cart/${TEST_PRODUCTS.digital.productId}`)
      .set(auth);

    assert.equal(deleteResponse.status, 200);
    assert.equal(deleteResponse.body.length, 0);
  });

  test("add to cart fails for non-existent product", async () => {
    const token = await loginAndGetToken();

    const response = await request(app)
      .post("/api/cart")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: 999999999, quantity: 1 });

    assert.equal(response.status, 404);
  });
});
