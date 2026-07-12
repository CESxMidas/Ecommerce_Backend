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
import { INVALID_PAYLOADS, TEST_PRODUCTS, TEST_USER } from "./helpers/fixtures.js";
import { markPaymentPaid } from "../services/payment.service.js";

const mongoUrl = getTestMongoUrl();
const app = createTestApp();

async function loginAndGetToken() {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email: TEST_USER.email, password: TEST_USER.password });

  return response.body.token;
}

test.describe("Orders API integration", { skip: !mongoUrl }, () => {
  test.before(async () => {
    await connectTestDb();
    await seedTestData();
  });

  test.after(async () => {
    await cleanupTestData();
    await disconnectTestDb();
  });

  test("POST /orders fails when items array is empty", async () => {
    const token = await loginAndGetToken();

    const response = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send(INVALID_PAYLOADS.orderEmptyItems);

    assert.equal(response.status, 400);
  });

  test("POST /orders fails when user is not authenticated", async () => {
    const response = await request(app).post("/api/orders").send({
      name: TEST_USER.name,
      email: TEST_USER.email,
      phone: "+84901234567",
      address: "123 QA Street",
      items: [{ productId: TEST_PRODUCTS.physical.productId, quantity: 1 }],
      paymentMethod: "cod",
    });

    assert.equal(response.status, 401);
  });

  test("creates COD order for physical product and lists order status", async () => {
    const token = await loginAndGetToken();
    const auth = { Authorization: `Bearer ${token}` };

    const response = await request(app)
      .post("/api/orders")
      .set(auth)
      .send({
        name: TEST_USER.name,
        email: TEST_USER.email,
        phone: "+84901234567",
        address: "123 QA Street, District 1, HCM",
        items: [{ productId: TEST_PRODUCTS.physical.productId, quantity: 1 }],
        paymentMethod: "cod",
      });

    assert.equal(response.status, 201);
    assert.ok(response.body.id);
    assert.ok(response.body.total > 0);
    assert.equal(response.body.paymentMethod, "cod");

    const listResponse = await request(app).get("/api/orders").set(auth);
    assert.equal(listResponse.status, 200);
    const orders = Array.isArray(listResponse.body)
      ? listResponse.body
      : listResponse.body.orders;
    assert.ok(orders.some((order) => order.id === response.body.id));
  });

  test("POST /orders ignores client-supplied total and variant price, recomputes from DB", async () => {
    const token = await loginAndGetToken();
    const auth = { Authorization: `Bearer ${token}` };
    const quantity = 2;
    const expectedTotal = TEST_PRODUCTS.physical.price * quantity;

    const response = await request(app)
      .post("/api/orders")
      .set(auth)
      .send({
        name: TEST_USER.name,
        email: TEST_USER.email,
        phone: "+84901234567",
        address: "123 QA Street, District 1, HCM",
        // Malicious client values — all must be ignored by the server.
        total: 1000,
        items: [
          {
            productId: TEST_PRODUCTS.physical.productId,
            quantity,
            variant: { id: "spoofed", price: 1 },
          },
        ],
        paymentMethod: "cod",
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.total, expectedTotal);
    assert.equal(response.body.subtotal, expectedTotal);
    assert.equal(response.body.items[0].unitPrice, TEST_PRODUCTS.physical.price);
  });

  test("simulated VNPay payment marks digital order as paid", async () => {
    const token = await loginAndGetToken();
    const auth = { Authorization: `Bearer ${token}` };

    const response = await request(app)
      .post("/api/orders")
      .set(auth)
      .send({
        name: TEST_USER.name,
        email: TEST_USER.email,
        phone: "+84901234567",
        address: "Digital delivery",
        items: [{ productId: TEST_PRODUCTS.digital.productId, quantity: 1 }],
        paymentMethod: "vnpay",
      });

    assert.equal(response.status, 201);
    assert.ok(response.body.id);

    const paid = await markPaymentPaid({
      orderId: response.body.id,
      transactionId: "QA-MOCK-TXN",
      raw: { mock: true },
    });

    assert.ok(paid);
    assert.equal(paid.status, "paid");

    const detail = await request(app)
      .get(`/api/orders/${response.body.id}`)
      .set(auth);

    assert.equal(detail.status, 200);
    assert.equal(detail.body.paymentStatus, "paid");
  });

  test("POST /orders/track finds order by orderId and email", async () => {
    const token = await loginAndGetToken();

    const created = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: TEST_USER.name,
        email: TEST_USER.email,
        phone: "+84901234567",
        address: "123 QA Street",
        items: [{ productId: TEST_PRODUCTS.physical.productId, quantity: 1 }],
        paymentMethod: "cod",
      });

    const track = await request(app).post("/api/orders/track").send({
      orderId: created.body.id,
      contact: TEST_USER.email,
    });

    assert.equal(track.status, 200);
    assert.equal(track.body.id, created.body.id);
  });
});
