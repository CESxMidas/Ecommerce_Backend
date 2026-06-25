import assert from "node:assert/strict";
import test from "node:test";

import {
  createVnpayCallbackQuery,
  createVNPayUrl,
  verifyVNPay,
} from "../services/vnpay.service.js";

test("createVNPayUrl uses query string compatible with VNPay checksum", () => {
  const previous = {
    tmn: process.env.VNPAY_TMN_CODE,
    secret: process.env.VNPAY_HASH_SECRET,
    apiUrl: process.env.API_URL,
  };

  process.env.VNPAY_TMN_CODE = "D7Z1CHEW";
  process.env.VNPAY_HASH_SECRET = "RTV1RS37VNKVPTK2LKTYW3SY3H1M3BQ6";
  process.env.API_URL = "https://ecommerce-backend-w4nx.onrender.com";

  try {
    const url = createVNPayUrl({
      orderId: "ORD-TEST-001",
      amount: 590_000,
      currency: "VND",
      clientIp: "127.0.0.1",
    });

    assert.match(url, /^https:\/\/sandbox\.vnpayment\.vn\/paymentv2\/vpcpay\.html\?/);
    assert.match(url, /vnp_SecureHash=[a-f0-9]{128}$/);
    assert.doesNotMatch(url, /URLSearchParams/);

    const queryString = url.split("?")[1];
    const params = Object.fromEntries(new URLSearchParams(queryString));
    const { vnp_SecureHash, ...unsigned } = params;

    assert.equal(verifyVNPay({ ...unsigned, vnp_SecureHash }), true);
  } finally {
    process.env.VNPAY_TMN_CODE = previous.tmn;
    process.env.VNPAY_HASH_SECRET = previous.secret;
    process.env.API_URL = previous.apiUrl;
  }
});

test("verifyVNPay accepts signed callback query", () => {
  const previous = {
    tmn: process.env.VNPAY_TMN_CODE,
    secret: process.env.VNPAY_HASH_SECRET,
  };

  process.env.VNPAY_TMN_CODE = "D7Z1CHEW";
  process.env.VNPAY_HASH_SECRET = "RTV1RS37VNKVPTK2LKTYW3SY3H1M3BQ6";

  try {
    const query = createVnpayCallbackQuery({
      orderId: "ORD-TEST-002",
      amount: 690_000,
      currency: "VND",
    });

    assert.equal(verifyVNPay(query), true);
  } finally {
    process.env.VNPAY_TMN_CODE = previous.tmn;
    process.env.VNPAY_HASH_SECRET = previous.secret;
  }
});
