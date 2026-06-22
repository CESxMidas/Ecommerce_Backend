import {
  assignAccountCredentialsFromPool,
  releaseReservedAccountsForOrder,
  reserveAccountsForItems,
} from "./accountCredentialPool.js";

export {
  assignAccountCredentialsFromPool,
  countAvailableAccounts,
  getAccountPoolStats,
  getAvailableAccountCountsMap,
  importAccountsToPool,
  isAccountPoolProduct,
  listPoolAccounts,
  parseAccountCredentialLines,
  releaseReservedAccountsForOrder,
  reserveAccountsForItems,
  revokeAvailableAccount,
  syncProductStockFromAccountPool,
} from "./accountCredentialPool.js";

export async function assignAccountCredentialsToOrder(order, session = null) {
  return assignAccountCredentialsFromPool(order, session);
}

export async function reserveAccountsForOrder(order, session = null) {
  if (!order?.orderId || !order?.items?.length) {
    return;
  }

  await reserveAccountsForItems(order.items, order.orderId, session);
}

export async function releaseAccountsForOrder(order, session = null) {
  if (!order?.orderId) {
    return;
  }

  await releaseReservedAccountsForOrder(order.orderId, session);
}
