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

function normalizeVnpayParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  );
}

function getVnpaySecret() {
  return process.env.VNPAY_HASH_SECRET?.trim() || "";
}

function getVnpayTmnCode() {
  return process.env.VNPAY_TMN_CODE?.trim() || "";
}

function normalizeApiUrl() {
  return String(process.env.API_URL || "").trim().replace(/\/$/, "");
}

function normalizeClientIp(clientIp) {
  const raw = String(clientIp || "127.0.0.1").trim();

  if (raw.startsWith("::ffff:")) {
    return raw.slice("::ffff:".length);
  }

  if (raw.includes(":")) {
    return "127.0.0.1";
  }

  return raw;
}

function formatVnpayCreateDate(date = new Date()) {
  const vnOffsetMinutes = 7 * 60;
  const vnTime = new Date(
    date.getTime() + (vnOffsetMinutes + date.getTimezoneOffset()) * 60_000,
  );
  const pad = (value) => String(value).padStart(2, "0");

  return `${vnTime.getFullYear()}${pad(vnTime.getMonth() + 1)}${pad(vnTime.getDate())}${pad(vnTime.getHours())}${pad(vnTime.getMinutes())}${pad(vnTime.getSeconds())}`;
}

function signVnpayParamsObject(params) {
  const secret = getVnpaySecret();

  if (!secret) {
    throw new Error("VNPay credentials are not configured");
  }

  const sorted = sortObject(normalizeVnpayParams(params));

  return crypto
    .createHmac("sha512", secret)
    .update(buildSignData(sorted), "utf-8")
    .digest("hex");
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
  const tmnCode = getVnpayTmnCode();
  const secret = getVnpaySecret();
  const paymentUrl =
    process.env.VNPAY_PAYMENT_URL?.trim() ||
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  const apiUrl = normalizeApiUrl();

  if (!tmnCode || !secret) {
    throw new Error("VNPay credentials are not configured");
  }

  if (!apiUrl) {
    throw new Error("API_URL is not configured");
  }

  const vnpParams = normalizeVnpayParams({
    vnp_Amount: toVnpayAmount(amount, currency),
    vnp_Command: "pay",
    vnp_CreateDate: formatVnpayCreateDate(),
    vnp_CurrCode: "VND",
    vnp_IpAddr: normalizeClientIp(clientIp),
    vnp_Locale: "vn",
    vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: `${apiUrl}/api/payments/vnpay-return`,
    vnp_TmnCode: tmnCode,
    vnp_TxnRef: orderId,
    vnp_Version: "2.1.0",
  });

  const sorted = sortObject(vnpParams);
  const secureHash = signVnpayParamsObject(sorted);

  return `${paymentUrl}?${buildSignData(sorted)}&vnp_SecureHash=${secureHash}`;
}

function signVnpayParams(params) {
  const sorted = sortObject(normalizeVnpayParams(params));
  const secureHash = signVnpayParamsObject(sorted);

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
  const tmnCode = getVnpayTmnCode();

  if (!tmnCode) {
    throw new Error("VNPay credentials are not configured");
  }

  const params = {
    vnp_Amount: toVnpayAmount(amount, currency),
    vnp_BankCode: "NCB",
    vnp_BankTranNo: `MOCK${Date.now()}`,
    vnp_CardType: "ATM",
    vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
    vnp_PayDate: formatVnpayCreateDate(),
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
  const data = { ...query };
  const secureHash = data.vnp_SecureHash;

  delete data.vnp_SecureHash;
  delete data.vnp_SecureHashType;

  const sorted = sortObject(normalizeVnpayParams(data));

  return `${normalizedBase}${path}?${buildSignData(sorted)}&vnp_SecureHash=${secureHash}`;
}

export function verifyVNPay(query) {
  const secret = getVnpaySecret();

  if (!secret) {
    return false;
  }

  const secureHash = Array.isArray(query.vnp_SecureHash)
    ? query.vnp_SecureHash[0]
    : query.vnp_SecureHash;

  if (!secureHash) {
    return false;
  }

  const data = {};

  for (const [key, value] of Object.entries(query)) {
    if (key === "vnp_SecureHash" || key === "vnp_SecureHashType") {
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    data[key] = Array.isArray(value) ? value[0] : value;
  }

  const hash = crypto
    .createHmac("sha512", secret)
    .update(buildSignData(sortObject(normalizeVnpayParams(data))), "utf-8")
    .digest("hex");

  return hash.toLowerCase() === String(secureHash).toLowerCase();
}
