import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import ProductModel from "../models/product.model.js";
import {
  getAccountPoolStats,
  importAccountsToPool,
  isAccountPoolProduct,
  listPoolAccounts,
  parseAccountCredentialLines,
  revokeAvailableAccount,
} from "../utils/accountCredentialPool.js";

function parseAccountsPayload(body = {}) {
  if (Array.isArray(body.accounts)) {
    return body.accounts;
  }

  if (Array.isArray(body.lines)) {
    return body.lines;
  }

  if (typeof body.text === "string") {
    return body.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

async function getAccountPoolProduct(productId) {
  const product = await ProductModel.findOne({ productId: Number(productId) });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (!isAccountPoolProduct(product)) {
    throw new ApiError(400, "This product does not use the account credential pool");
  }

  return product;
}

export const getProductAccountStats = asyncHandler(async (request, response) => {
  await getAccountPoolProduct(request.params.productId);
  const stats = await getAccountPoolStats(request.params.productId);
  response.json(stats);
});

export const listProductAccounts = asyncHandler(async (request, response) => {
  await getAccountPoolProduct(request.params.productId);

  const result = await listPoolAccounts(request.params.productId, {
    status: request.query.status,
    page: request.query.page,
    limit: request.query.limit,
  });

  response.json(result);
});

export const importProductAccounts = asyncHandler(async (request, response) => {
  const productId = Number(request.params.productId);
  await getAccountPoolProduct(productId);

  const lines = parseAccountsPayload(request.body);
  const accounts = parseAccountCredentialLines(lines);

  if (accounts.length === 0) {
    throw new ApiError(
      400,
      "Provide accounts[] or text with one account per line: email|password|note",
    );
  }

  const result = await importAccountsToPool({
    productId,
    accounts,
    importedBy: request.user?._id || null,
  });

  response.status(201).json(result);
});

export const revokeProductAccount = asyncHandler(async (request, response) => {
  const productId = Number(request.params.productId);
  await getAccountPoolProduct(productId);

  const doc = await revokeAvailableAccount(productId, request.params.accountId);

  response.json({
    message: "Account revoked",
    username: doc.username,
  });
});
