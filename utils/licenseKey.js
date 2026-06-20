import {
  assignLicenseKeysFromPool,
  releaseReservedKeysForOrder,
  reserveKeysForItems,
} from "./licenseKeyPool.js";

export {
  assignLicenseKeysFromPool,
  applyPoolStockToFormattedProducts,
  countAvailableKeys,
  enrichFormattedProductWithPoolStock,
  enrichFormattedProductsWithPoolStock,
  getAvailableKeyCountsMap,
  getPoolStats,
  importKeysToPool,
  isPoolProduct,
  listPoolKeys,
  releaseReservedKeysForOrder,
  reserveKeysForItems,
  revokeAvailableKey,
  syncProductStockFromPool,
} from "./licenseKeyPool.js";

export async function assignLicenseKeysToOrder(order, session = null) {
  return assignLicenseKeysFromPool(order, session);
}

export async function reserveKeysForOrder(order, session = null) {
  if (!order?.orderId || !order?.items?.length) {
    return;
  }

  await reserveKeysForItems(order.items, order.orderId, session);
}

export async function releaseKeysForOrder(order, session = null) {
  if (!order?.orderId) {
    return;
  }

  await releaseReservedKeysForOrder(order.orderId, session);
}
