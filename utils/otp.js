import crypto from "crypto";

export const OTP_EXPIRY_MS = 15 * 60 * 1000;

export const OTP_PURPOSE = {
  VERIFY_EMAIL: "verify_email",
  RESET_PASSWORD: "reset_password",
  CHANGE_EMAIL: "change_email",
};

export function createOtp() {
  return String(crypto.randomInt(100000, 999999));
}

export function hashOtp(email, otp, purpose = "") {
  return crypto
    .createHash("sha256")
    .update(
      `${String(email).trim().toLowerCase()}:${String(otp).trim()}:${purpose}`,
    )
    .digest("hex");
}
