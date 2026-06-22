import "dotenv/config";

import mongoose from "mongoose";

import OrderModel from "../models/order.model.js";
import {
  buildVnpayCallbackUrl,
  createVnpayCallbackQuery,
  toVnpayAmount,
} from "../services/vnpay.service.js";

function parseArgs(argv) {
  const args = {};

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--fail") {
      args.fail = true;
      continue;
    }

    if (arg.startsWith("--orderId=")) {
      args.orderId = arg.slice("--orderId=".length);
      continue;
    }

    if (arg === "--orderId") {
      args.orderId = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--baseUrl=")) {
      args.baseUrl = arg.slice("--baseUrl=".length);
      continue;
    }

    if (arg === "--baseUrl") {
      args.baseUrl = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

function formatMoney(amount, currency) {
  if (currency === "USD") {
    return `$${Number(amount).toLocaleString("en-US")}`;
  }

  return `${Number(amount).toLocaleString("vi-VN")} VND`;
}

async function vnpayMock() {
  const { orderId, fail, baseUrl } = parseArgs(process.argv);

  if (!orderId) {
    console.error("\nUsage:");
    console.error("  npm run vnpay:mock -- --orderId=ORD-20260622-8316F1");
    console.error("\nOptions:");
    console.error("  --fail                 Simulate failed payment (vnp_ResponseCode=24)");
    console.error("  --baseUrl=http://...   API base (default: API_URL or http://localhost:888)");
    process.exit(1);
  }

  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required");
  }

  if (!process.env.VNPAY_HASH_SECRET || !process.env.VNPAY_TMN_CODE) {
    throw new Error("VNPAY_HASH_SECRET and VNPAY_TMN_CODE are required");
  }

  await mongoose.connect(process.env.MONGODB_URL);

  const order = await OrderModel.findOne({ orderId });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (order.paymentMethod !== "vnpay") {
    throw new Error(`Order ${orderId} is not a VNPay order (method: ${order.paymentMethod})`);
  }

  if (order.paymentStatus === "paid") {
    throw new Error(`Order ${orderId} is already paid`);
  }

  const responseCode = fail ? "24" : "00";
  const query = createVnpayCallbackQuery({
    orderId: order.orderId,
    amount: order.total,
    currency: order.currency,
    responseCode,
  });

  const apiBase =
    baseUrl ||
    process.env.VNPAY_MOCK_BASE_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:888"
      : process.env.API_URL) ||
    "http://localhost:888";

  const ipnUrl = buildVnpayCallbackUrl(apiBase, "/api/payments/vnpay-ipn", query);
  const returnUrl = buildVnpayCallbackUrl(
    apiBase,
    "/api/payments/vnpay-return",
    query,
  );

  console.log("\n=== VNPay mock callback (dev only) ===\n");
  console.log(`Order ID     : ${order.orderId}`);
  console.log(`Total        : ${formatMoney(order.total, order.currency)}`);
  console.log(`vnp_Amount   : ${toVnpayAmount(order.total, order.currency)}`);
  console.log(`Result       : ${fail ? "FAILED (24)" : "SUCCESS (00)"}`);
  console.log(`API base     : ${apiBase}`);

  console.log("\n1) Postman — copy URL IPN below, method GET, then Send:");
  console.log(ipnUrl);

  console.log("\n2) Browser — open return URL to redirect back to storefront:");
  console.log(returnUrl);

  console.log("\nExpected:");
  if (fail) {
    console.log('- IPN JSON: { "RspCode": "00", "Message": "Confirm success" } (failed payment ack)');
    console.log("- Order paymentStatus should remain pending/failed");
  } else {
    console.log('- IPN JSON: { "RspCode": "00", "Message": "Confirm success" }');
    console.log("- Order paymentStatus should become paid");
  }

  console.log("\nNote: Backend must be running at the API base URL above.\n");
}

vnpayMock()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error("VNPay mock failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
