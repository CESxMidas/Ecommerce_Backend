/**
 * Run the integration test suite against a throwaway in-memory MongoDB replica
 * set. Transactions (used by the order/payment/coupon flows) require a replica
 * set, so a plain standalone mongod is not enough — MongoMemoryReplSet gives us
 * a single-node rs with zero external setup.
 *
 * We start ONE shared instance here, export its URL via TEST_MONGODB_URL, then
 * spawn `node --test` as a child that inherits the env. dotenv (loaded inside
 * the tests via setupEnv.js) does not override already-set variables, so the
 * memory URL wins and the suite can never accidentally hit the real Atlas DB.
 */
import { spawn } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const TEST_PATTERNS = [
  "test/*.api.integration.test.js",
  "test/cart-payment.integration.test.js",
  "test/race.integration.test.js",
];

async function main() {
  console.log("[memory-db] Starting in-memory MongoDB replica set…");
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });

  const uri = replSet.getUri("keyshop_qa");
  console.log(`[memory-db] Ready at ${uri}`);

  const child = spawn(
    process.execPath,
    ["--test", "--test-concurrency=1", ...TEST_PATTERNS],
    {
      stdio: "inherit",
      env: { ...process.env, TEST_MONGODB_URL: uri },
    },
  );

  const exitCode = await new Promise((resolve) => {
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (error) => {
      console.error("[memory-db] Failed to start test runner:", error);
      resolve(1);
    });
  });

  console.log("[memory-db] Stopping in-memory MongoDB…");
  await replSet.stop();

  process.exit(exitCode);
}

main().catch((error) => {
  console.error("[memory-db] Fatal error:", error);
  process.exit(1);
});
