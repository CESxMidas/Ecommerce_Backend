import LicenseKeyModel from "../models/licenseKey.model.js";
import ProductModel from "../models/product.model.js";
import { ApiError } from "./apiError.js";

export function isPoolProduct(product) {
  if (!product) {
    return false;
  }

  const productType = product.productType || product?.product?.productType;
  const deliveryType = product.deliveryType || product?.product?.deliveryType;

  return (
    ["license_key", "redeem_code"].includes(productType) &&
    deliveryType === "instant_key"
  );
}

function normalizeKeyValue(value) {
  return String(value || "").trim();
}

export async function countAvailableKeys(productId, session = null) {
  return LicenseKeyModel.countDocuments({
    productId: Number(productId),
    status: "available",
  }).session(session);
}

export async function syncProductStockFromPool(productId, session = null) {
  const available = await countAvailableKeys(productId, session);

  await ProductModel.updateOne(
    { productId: Number(productId) },
    { $set: { stock: available } },
    { session },
  );

  return available;
}

export async function importKeysToPool({
  productId,
  keys = [],
  importedBy = null,
  session = null,
}) {
  const normalizedProductId = Number(productId);
  const product = await ProductModel.findOne({ productId: normalizedProductId }).session(
    session,
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (!isPoolProduct(product)) {
    throw new ApiError(
      400,
      "Key pool import is only supported for license_key/redeem_code with instant_key delivery",
    );
  }

  const uniqueKeys = [
    ...new Set(
      keys.map(normalizeKeyValue).filter((key) => key.length > 0),
    ),
  ];

  if (uniqueKeys.length === 0) {
    throw new ApiError(400, "No valid keys to import");
  }

  const existing = await LicenseKeyModel.find({
    key: { $in: uniqueKeys },
  })
    .select("key")
    .session(session);
  const existingSet = new Set(existing.map((doc) => doc.key));
  const toInsert = uniqueKeys.filter((key) => !existingSet.has(key));

  if (toInsert.length > 0) {
    await LicenseKeyModel.insertMany(
      toInsert.map((key) => ({
        key,
        productId: normalizedProductId,
        status: "available",
        importedBy,
      })),
      { session, ordered: false },
    );
  }

  const available = await syncProductStockFromPool(normalizedProductId, session);

  return {
    imported: toInsert.length,
    skippedDuplicates: uniqueKeys.length - toInsert.length,
    available,
  };
}

export async function getPoolStats(productId, session = null) {
  const normalizedProductId = Number(productId);
  const [available, reserved, sold, revoked, total] = await Promise.all([
    LicenseKeyModel.countDocuments({
      productId: normalizedProductId,
      status: "available",
    }).session(session),
    LicenseKeyModel.countDocuments({
      productId: normalizedProductId,
      status: "reserved",
    }).session(session),
    LicenseKeyModel.countDocuments({
      productId: normalizedProductId,
      status: "sold",
    }).session(session),
    LicenseKeyModel.countDocuments({
      productId: normalizedProductId,
      status: "revoked",
    }).session(session),
    LicenseKeyModel.countDocuments({ productId: normalizedProductId }).session(session),
  ]);

  return { available, reserved, sold, revoked, total };
}

export async function reserveKeysForItems(items = [], orderId, session = null) {
  for (const item of items) {
    if (!isPoolProduct(item.product)) {
      continue;
    }

    const productId = Number(item.productId);
    const quantity = Number(item.quantity);

    for (let index = 0; index < quantity; index += 1) {
      const reserved = await LicenseKeyModel.findOneAndUpdate(
        { productId, status: "available" },
        { $set: { status: "reserved", orderId } },
        { new: true, session, sort: { createdAt: 1 } },
      );

      if (!reserved) {
        const productName =
          item.product?.name || item.product?.title || `Product ${productId}`;
        throw new ApiError(
          400,
          `Không đủ key trong kho cho sản phẩm "${productName}"`,
        );
      }
    }
  }
}

export async function releaseReservedKeysForOrder(orderId, session = null) {
  await LicenseKeyModel.updateMany(
    { orderId, status: "reserved" },
    { $set: { status: "available", orderId: null } },
    { session },
  );
}

export async function assignLicenseKeysFromPool(order, session = null) {
  if (!order?.items?.length || order.paymentStatus !== "paid") {
    return order;
  }

  let changed = false;

  for (const item of order.items) {
    if (item.licenseKeys?.length || !isPoolProduct(item.product)) {
      continue;
    }

    const keys = await LicenseKeyModel.find({
      orderId: order.orderId,
      productId: Number(item.productId),
      status: "reserved",
    })
      .sort({ createdAt: 1 })
      .limit(Number(item.quantity))
      .session(session);

    if (keys.length < Number(item.quantity)) {
      throw new ApiError(
        500,
        `Missing reserved keys for product ${item.productId} on order ${order.orderId}`,
      );
    }

    item.licenseKeys = keys.map((doc) => doc.key);
    const soldAt = new Date();

    await Promise.all(
      keys.map((doc) =>
        LicenseKeyModel.updateOne(
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

export async function listPoolKeys(productId, { status, page = 1, limit = 50 } = {}) {
  const filter = { productId: Number(productId) };

  if (status) {
    filter.status = status;
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    LicenseKeyModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .select("key status orderId soldAt createdAt"),
    LicenseKeyModel.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

export async function revokeAvailableKey(productId, keyId) {
  const doc = await LicenseKeyModel.findOneAndUpdate(
    {
      _id: keyId,
      productId: Number(productId),
      status: "available",
    },
    { $set: { status: "revoked" } },
    { new: true },
  );

  if (!doc) {
    throw new ApiError(404, "Available key not found");
  }

  await syncProductStockFromPool(productId);

  return doc;
}

export async function getAvailableKeyCountsMap(productIds = []) {
  const normalizedIds = [...new Set(productIds.map(Number).filter(Boolean))];

  if (normalizedIds.length === 0) {
    return new Map();
  }

  const rows = await LicenseKeyModel.aggregate([
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

export function applyPoolStockToFormattedProducts(products, countsMap) {
  return products.map((product) => {
    if (!isPoolProduct(product)) {
      return product;
    }

    const productId = Number(product.id ?? product.productId);
    const available = countsMap.get(productId) ?? 0;

    return {
      ...product,
      stock: available,
      usesKeyPool: true,
    };
  });
}

export async function enrichFormattedProductsWithPoolStock(products) {
  const formatted = products.filter(Boolean);
  const poolProductIds = formatted
    .filter((product) => isPoolProduct(product))
    .map((product) => Number(product.id ?? product.productId));

  if (poolProductIds.length === 0) {
    return formatted;
  }

  const countsMap = await getAvailableKeyCountsMap(poolProductIds);

  return applyPoolStockToFormattedProducts(formatted, countsMap);
}

export async function enrichFormattedProductWithPoolStock(product) {
  if (!product) {
    return product;
  }

  const [enriched] = await enrichFormattedProductsWithPoolStock([product]);
  return enriched;
}
