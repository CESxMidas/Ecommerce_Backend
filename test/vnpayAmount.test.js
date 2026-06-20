import assert from "node:assert/strict";
import test from "node:test";

import { toVnpayAmount } from "../services/vnpay.service.js";

test("toVnpayAmount uses VND total directly (×100 for VNPay)", () => {
  assert.equal(toVnpayAmount(690000, "VND"), 69_000_000);
  assert.equal(toVnpayAmount(1490000, "VND"), 149_000_000);
});

test("toVnpayAmount converts USD totals using exchange rate", () => {
  const previousRate = process.env.VNPAY_EXCHANGE_RATE;
  process.env.VNPAY_EXCHANGE_RATE = "25000";

  try {
    assert.equal(toVnpayAmount(28, "USD"), 70_000_000);
  } finally {
    if (previousRate === undefined) {
      delete process.env.VNPAY_EXCHANGE_RATE;
    } else {
      process.env.VNPAY_EXCHANGE_RATE = previousRate;
    }
  }
});
