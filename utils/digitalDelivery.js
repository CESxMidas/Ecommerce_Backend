import { assignAccountCredentialsToOrder, reserveAccountsForOrder, releaseAccountsForOrder } from "./accountCredential.js";
import { assignLicenseKeysToOrder, reserveKeysForOrder, releaseKeysForOrder } from "./licenseKey.js";

export async function reserveDigitalDeliverablesForOrder(order, session = null) {
  await reserveKeysForOrder(order, session);
  await reserveAccountsForOrder(order, session);
}

export async function assignDigitalDeliverablesToOrder(order, session = null) {
  await assignLicenseKeysToOrder(order, session);
  return assignAccountCredentialsToOrder(order, session);
}

export async function releaseDigitalDeliverablesForOrder(order, session = null) {
  await releaseKeysForOrder(order, session);
  await releaseAccountsForOrder(order, session);
}
