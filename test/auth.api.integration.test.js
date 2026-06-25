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
import { INVALID_PAYLOADS, TEST_USER } from "./helpers/fixtures.js";

const mongoUrl = getTestMongoUrl();
const app = createTestApp();

test.describe("Auth API integration", { skip: !mongoUrl }, () => {
  test.before(async () => {
    await connectTestDb();
    await seedTestData();
  });

  test.after(async () => {
    await cleanupTestData();
    await disconnectTestDb();
  });

  test("login succeeds with valid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    assert.equal(response.status, 200);
    assert.ok(response.body.token);
    assert.equal(response.body.email, TEST_USER.email);
  });

  test("login fails with wrong password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send(INVALID_PAYLOADS.loginWrongPassword);

    assert.equal(response.status, 401);
    assert.match(response.body.message, /invalid/i);
  });

  test("login fails when email is missing", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send(INVALID_PAYLOADS.loginMissingEmail);

    assert.equal(response.status, 400);
  });

  test("register fails when email already exists", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Duplicate",
      email: TEST_USER.email,
      password: "Another@123",
    });

    assert.equal(response.status, 409);
  });

  test("register fails with weak password validation", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(INVALID_PAYLOADS.registerWeakPassword);

    assert.equal(response.status, 400);
  });

  test("GET /auth/me requires authentication", async () => {
    const response = await request(app).get("/api/auth/me");
    assert.equal(response.status, 401);
  });

  test("GET /auth/me returns profile when authenticated", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.email, TEST_USER.email);
  });
});
