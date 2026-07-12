import AccountCredentialModel from "../models/accountCredential.model.js";
import ProductModel from "../models/product.model.js";
import { ApiError } from "./apiError.js";

export function isAccountPoolProduct(product) {
  if (!product) {
    return false;
  }

  const productType = product.productType || product?.product?.productType;
  const deliveryType = product.deliveryType || product?.product?.deliveryType;

  return productType === "account" && deliveryType === "account_credentials";
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function normalizePassword(value) {
  return String(value || "").trim();
}

export function parseAccountCredentialLines(lines = []) {
  const parsed = [];

  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();
    if (!line) continue;

    let username = "";
    let password = "";
    let note = "";

    if (line.includes("|")) {
      const parts = line.split("|").map((part) => part.trim());
      [username, password, note = ""] = parts;
    } else if (line.includes(",")) {
      const parts = line.split(",").map((part) => part.trim().replace(/^"|"$/g, ""));
      [username, password, note = ""] = parts;
    } else if (line.includes(":")) {
      const parts = line.split(":").map((part) => part.trim());
      [username, password, note = ""] = parts;
    }

    username = normalizeUsername(username);
    password = normalizePassword(password);

    if (!username || !password) {
      continue;
    }

    parsed.push({
      username,
      password,
      note: String(note || "").trim(),
    });
  }

  return parsed;
}

export async function countAvailableAccounts(productId, session = null) {
  return AccountCredentialModel.countDocuments({
    productId: Number(productId),
    status: "available",
  }).session(session);
}

export async function syncProductStockFromAccountPool(productId, session = null) {
  const available = await countAvailableAccounts(productId, session);

  await ProductModel.updateOne(
    { productId: Number(productId) },
    { $set: { stock: available } },
    { session },
  );

  return available;
}

export async function importAccountsToPool({
  productId,
  accounts = [],
  importedBy = null,
  session = null,
}) {
  const normalizedProductId = Number(productId);
  const product = await ProductModel.findOne({
    productId: normalizedProductId,
  }).session(session);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (!isAccountPoolProduct(product)) {
    throw new ApiError(
      400,
      "Account pool import is only supported for account products with account_credentials delivery",
    );
  }

  const normalized = parseAccountCredentialLines(
    accounts.map((entry) =>
      typeof entry === "string"
        ? entry
        : `${entry.username}|${entry.password}|${entry.note || ""}`,
    ),
  );

  if (normalized.length === 0) {
    throw new ApiError(400, "No valid accounts to import");
  }

  const usernames = normalized.map((entry) => entry.username);
  const existing = await AccountCredentialModel.find({
    productId: normalizedProductId,
    username: { $in: usernames },
  })
    .select("username")
    .session(session);
  const existingSet = new Set(existing.map((doc) => doc.username));
  const toInsert = normalized.filter((entry) => !existingSet.has(entry.username));

  if (toInsert.length > 0) {
    await AccountCredentialModel.insertMany(
      toInsert.map((entry) => ({
        username: entry.username,
        password: entry.password,
        note: entry.note,
        productId: normalizedProductId,
        status: "available",
        importedBy,
      })),
      { session, ordered: false },
    );
  }

  const available = await syncProductStockFromAccountPool(
    normalizedProductId,
    session,
  );

  return {
    imported: toInsert.length,
    skippedDuplicates: normalized.length - toInsert.length,
    available,
  };
}

export async function getAccountPoolStats(productId, session = null) {
  const normalizedProductId = Number(productId);
  const [available, reserved, sold, revoked, total] = await Promise.all([
    AccountCredentialModel.countDocuments({
      productId: normalizedProductId,
      status: "available",
    }).session(session),
    AccountCredentialModel.countDocuments({
      productId: normalizedProductId,
      status: "reserved",
    }).session(session),
    AccountCredentialModel.countDocuments({
      productId: normalizedProductId,
      status: "sold",
    }).session(session),
    AccountCredentialModel.countDocuments({
      productId: normalizedProductId,
      status: "revoked",
    }).session(session),
    AccountCredentialModel.countDocuments({
      productId: normalizedProductId,
    }).session(session),
  ]);

  return { available, reserved, sold, revoked, total };
}

export async function reserveAccountsForItems(items = [], orderId, session = null) {
  for (const item of items) {
    if (!isAccountPoolProduct(item.product)) {
      continue;
    }

    const productId = Number(item.productId);
    const quantity = Number(item.quantity);

    for (let index = 0; index < quantity; index += 1) {
      const reserved = await AccountCredentialModel.findOneAndUpdate(
        { productId, status: "available" },
        { $set: { status: "reserved", orderId } },
        { returnDocument: "after", session, sort: { createdAt: 1 } },
      );

      if (!reserved) {
        const productName =
          item.product?.name || item.product?.title || `Product ${productId}`;
        throw new ApiError(
          400,
          `Không đủ tài khoản trong kho cho sản phẩm "${productName}"`,
        );
      }
    }
  }
}

export async function releaseReservedAccountsForOrder(orderId, session = null) {
  await AccountCredentialModel.updateMany(
    { orderId, status: "reserved" },
    { $set: { status: "available", orderId: null } },
    { session },
  );
}

export async function assignAccountCredentialsFromPool(order, session = null) {
  if (!order?.items?.length || order.paymentStatus !== "paid") {
    return order;
  }

  let changed = false;

  for (const item of order.items) {
    if (item.accountCredentials?.length || !isAccountPoolProduct(item.product)) {
      continue;
    }

    const docs = await AccountCredentialModel.find({
      orderId: order.orderId,
      productId: Number(item.productId),
      status: "reserved",
    })
      .sort({ createdAt: 1 })
      .limit(Number(item.quantity))
      .session(session);

    if (docs.length < Number(item.quantity)) {
      throw new ApiError(
        500,
        `Missing reserved accounts for product ${item.productId} on order ${order.orderId}`,
      );
    }

    item.accountCredentials = docs.map((doc) => ({
      username: doc.username,
      password: doc.password,
      note: doc.note || "",
    }));

    const soldAt = new Date();

    await Promise.all(
      docs.map((doc) =>
        AccountCredentialModel.updateOne(
          { _id: doc._id },
          { $set: { status: "sold", soldAt } },
          { session },
        ),
      ),
    );

    changed = true;
  }

  if (changed) {
    await order.save({ session });
  }

  return order;
}

export async function listPoolAccounts(
  productId,
  { status, page = 1, limit = 50 } = {},
) {
  const filter = { productId: Number(productId) };

  if (status) {
    filter.status = status;
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    AccountCredentialModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .select("username password note status orderId soldAt createdAt"),
    AccountCredentialModel.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

export async function revokeAvailableAccount(productId, accountId) {
  const doc = await AccountCredentialModel.findOneAndUpdate(
    {
      _id: accountId,
      productId: Number(productId),
      status: "available",
    },
    { $set: { status: "revoked" } },
    { returnDocument: "after" },
  );

  if (!doc) {
    throw new ApiError(404, "Available account not found");
  }

  await syncProductStockFromAccountPool(productId);

  return doc;
}

export async function getAvailableAccountCountsMap(productIds = []) {
  const normalizedIds = [...new Set(productIds.map(Number).filter(Boolean))];

  if (normalizedIds.length === 0) {
    return new Map();
  }

  const rows = await AccountCredentialModel.aggregate([
    {
      $match: {
        productId: { $in: normalizedIds },
        status: "available",
      },
    },
    {
      $group: {
        _id: "$productId",
        count: { $sum: 1 },
      },
    },
  ]);

  return new Map(rows.map((row) => [row._id, row.count]));
}
