export const ORDER_STATUS_LABELS = {
  PendingPayment: "Chờ thanh toán",
  Processing: "Đang xử lý",
  Shipped: "Đang giao hàng",
  Delivered: "Đã giao hàng",
  Cancelled: "Đã hủy",
  Failed: "Thất bại",
  Refunded: "Đã hoàn tiền",
};

export const PAYMENT_STATUS_LABELS = {
  pending: "Chờ thanh toán",
  awaiting_cod: "Chờ thu COD",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  refunded: "Đã hoàn tiền",
};

export const PRODUCT_TYPE_LABELS = {
  license_key: "Key bản quyền",
  redeem_code: "Mã nạp",
  account: "Tài khoản",
  manual_service: "Dịch vụ thủ công",
  hardware: "Phần cứng",
};

export const DELIVERY_TYPE_LABELS = {
  instant_key: "Giao key ngay",
  account_credentials: "Giao tài khoản",
  manual_delivery: "Xử lý thủ công",
  physical: "Giao hàng vật lý",
};

export const BADGE_LABELS = {
  HOT: "Nổi bật",
  SECURE: "Bảo mật",
  BYPASS: "Bypass",
  CODE: "Mã nạp",
  GIFT: "Quà tặng",
  ACCOUNT: "Tài khoản",
  SERVICE: "Dịch vụ",
  COD: "COD",
};

export function getOrderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || status;
}

export function getPaymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || status;
}

export function getProductTypeLabel(productType) {
  return PRODUCT_TYPE_LABELS[productType] || "Sản phẩm";
}

export function getDeliveryTypeLabel(deliveryType) {
  return DELIVERY_TYPE_LABELS[deliveryType] || "Giao hàng số";
}

export function getBadgeLabel(badge) {
  const value = String(badge || "").trim();

  if (!value) {
    return "";
  }

  return BADGE_LABELS[value] || value;
}
