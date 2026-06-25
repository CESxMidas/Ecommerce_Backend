/**
 * Seed isolated QA data into TEST_MONGODB_URL (or MONGODB_URL).
 * Run: npm run seed:test
 */
import "../test/helpers/setupEnv.js";
import { connectTestDb, disconnectTestDb, seedTestData } from "../test/helpers/db.js";
import { TEST_USER } from "../test/helpers/fixtures.js";

async function main() {
  await connectTestDb();
  const { user } = await seedTestData();

  console.log("[seed:test] Done");
  console.log(`  User: ${TEST_USER.email} / ${TEST_USER.password}`);
  console.log(`  UserId: ${user._id}`);
  console.log("  Products: 990001 (digital), 990002 (physical COD)");
}

main()
  .then(() => disconnectTestDb())
  .catch((error) => {
    console.error("[seed:test] Failed:", error.message);
    process.exit(1);
  });
