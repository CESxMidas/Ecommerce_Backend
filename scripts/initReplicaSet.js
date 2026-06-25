/**
 * Initialize single-node replica set for local MongoDB (required for transactions).
 * Run after setup-mongo-replica-set.ps1 or when replSetName=rs0 is already in mongod.cfg.
 */
import { MongoClient } from "mongodb";

const url = process.env.TEST_MONGODB_URL || "mongodb://127.0.0.1:27017/?replicaSet=rs0";

async function main() {
  const client = new MongoClient(url, {
    serverSelectionTimeoutMS: 10_000,
    directConnection: true,
  });

  try {
    await client.connect();
    const admin = client.db("admin");

    let status;
    try {
      status = await admin.command({ replSetGetStatus: 1 });
    } catch {
      status = null;
    }

    if (status?.ok === 1) {
      console.log("[replica-set] Already initialized:", status.set);
      return;
    }

    const result = await admin.command({
      replSetInitiate: {
        _id: "rs0",
        members: [{ _id: 0, host: "127.0.0.1:27017" }],
      },
    });

    console.log("[replica-set] Initiated:", result.ok === 1 ? "ok" : result);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("[replica-set] Failed:", error.message);
  process.exit(1);
});
