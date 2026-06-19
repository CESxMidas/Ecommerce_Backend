import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import ProductModel from "../models/product.model.js";
import {
  getPoolStats,
  importKeysToPool,
  isPoolProduct,
  listPoolKeys,
  revokeAvailableKey,
} from "../utils/licenseKeyPool.js";

function parseKeysPayload(body = {}) {
  if (Array.isArray(body.keys)) {
    return body.keys;
  }

  if (typeof body.text === "string") {
    return body.text
      .split(/\r?\n|,|;/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

async function getPoolProduct(productId) {
  const product = await ProductModel.findOne({ productId: Number(productId) });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (!isPoolProduct(product)) {
    throw new ApiError(
      400,
      "This product does not use the license key pool",
    );
  }

  return product;
}

export const getProductKeyStats = asyncHandler(async (request, response) => {
  await getPoolProduct(request.params.productId);
  const stats = await getPoolStats(request.params.productId);

  response.json(stats);
});

export const listProductKeys = asyncHandler(async (request, response) => {
  await getPoolProduct(request.params.productId);

  const result = await listPoolKeys(request.params.productId, {
    status: request.query.status,
    page: request.query.page,
    limit: request.query.limit,
  });

  response.json(result);
});

export const importProductKeys = asyncHandler(async (request, response) => {
  const productId = Number(request.params.productId);
  await getPoolProduct(productId);

  const keys = parseKeysPayload(request.body);

  if (keys.length === 0) {
    throw new ApiError(400, "Provide keys[] array or text with one key per line");
  }

  const result = await importKeysToPool({
    productId,
    keys,
    importedBy: request.user?._id || null,
  });

  response.status(201).json(result);
});

export const revokeProductKey = asyncHandler(async (request, response) => {
  const productId = Number(request.params.productId);
  await getPoolProduct(productId);

  const doc = await revokeAvailableKey(productId, request.params.keyId);

  response.json({
    message: "Key revoked",
    key: doc.key,
  });
});
