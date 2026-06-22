import crypto from "crypto";

function sortObject(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = obj[key];
      return result;
    }, {});
}

function encodeVnpayValue(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, "+");
}

function buildSignData(params) {
  return Object.keys(params)
    .map((key) => `${encodeVnpayValue(key)}=${encodeVnpayValue(params[key])}`)
    .join("&");
}

export function getVnpayExchangeRate() {
  const configuredRate = Number(process.env.VNPAY_EXCHANGE_RATE);

  return Number.isFinite(configuredRate) && configuredRate > 0
    ? configuredRate
    : 25000;
}

function toVndAmount(amount, currency = "VND") {
  const normalizedAmount = Math.max(0, Number(amount) || 0);
  const normalizedCurrency = String(currency || "VND").trim().toUpperCase();

  if (normalizedCurrency === "USD") {
    return normalizedAmount * getVnpayExchangeRate();
  }

  return normalizedAmount;
}

/** VNPay expects vnp_Amount = payment amount in VND × 100 */
export function toVnpayAmount(amount, currency = "VND") {
  return Math.round(toVndAmount(amount, currency) * 100);
}

export function createVNPayUrl({
  orderId,
  amount,
  currency = "VND",
  clientIp = "127.0.0.1",
}) {
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const secret = process.env.VNPAY_HASH_SECRET;
  const paymentUrl =
    process.env.VNPAY_PAYMENT_URL ||
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

  if (!tmnCode || !secret) {
    throw new Error("VNPay credentials are not configured");
  }

  const vnpParams = {
    vnp_Amount: toVnpayAmount(amount, currency),
    vnp_Command: "pay",
    vnp_CreateDate: new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14),
    vnp_CurrCode: "VND",
    vnp_IpAddr: clientIp,
    vnp_Locale: "vn",
    vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
    vnp_OrderType: "billpayment",
    vnp_ReturnUrl: `${process.env.API_URL}/api/payments/vnpay-return`,
    vnp_TmnCode: tmnCode,
    vnp_TxnRef: orderId,
    vnp_Version: "2.1.0",
  };

  const sorted = sortObject(vnpParams);
  const secureHash = crypto
    .createHmac("sha512", secret)
    .update(buildSignData(sorted), "utf-8")
    .digest("hex");

  const query = new URLSearchParams(sorted);
  query.append("vnp_SecureHash", secureHash);

  return `${paymentUrl}?${query.toString()}`;
}

function signVnpayParams(params) {
  const secret = process.env.VNPAY_HASH_SECRET;

  if (!secret) {
    throw new Error("VNPay credentials are not configured");
  }

  const sorted = sortObject(params);
  const secureHash = crypto
    .createHmac("sha512", secret)
    .update(buildSignData(sorted), "utf-8")
    .digest("hex");

  return { ...sorted, vnp_SecureHash: secureHash };
}

/** Build signed query params mimicking a VNPay IPN/return callback (dev testing only). */
export function createVnpayCallbackQuery({
  orderId,
  amount,
  currency = "VND",
  responseCode = "00",
  transactionNo,
}) {
  const tmnCode = process.env.VNPAY_TMN_CODE;

  if (!tmnCode) {
    throw new Error("VNPay credentials are not configured");
  }

  const params = {
    vnp_Amount: String(toVnpayAmount(amount, currency)),
    vnp_BankCode: "NCB",
    vnp_BankTranNo: `MOCK${Date.now()}`,
    vnp_CardType: "ATM",
    vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
    vnp_PayDate: new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14),
    vnp_ResponseCode: responseCode,
    vnp_TmnCode: tmnCode,
    vnp_TransactionNo:
      transactionNo ||
      String(Math.floor(10_000_000 + Math.random() * 90_000_000)),
    vnp_TransactionStatus: responseCode === "00" ? "00" : "02",
    vnp_TxnRef: orderId,
  };

  return signVnpayParams(params);
}

export function buildVnpayCallbackUrl(baseUrl, path, query) {
  const normalizedBase = String(baseUrl || "").replace(/\/$/, "");
  const search = new URLSearchParams(query);

  return `${normalizedBase}${path}?${search.toString()}`;
}

export function verifyVNPay(query) {
  const secret = process.env.VNPAY_HASH_SECRET;

  if (!secret) {
    return false;
  }

  const data = { ...query };
  const secureHash = data.vnp_SecureHash;

  delete data.vnp_SecureHash;
  delete data.vnp_SecureHashType;

  const hash = crypto
    .createHmac("sha512", secret)
    .update(buildSignData(sortObject(data)), "utf-8")
    .digest("hex");

  return hash === secureHash;
}
