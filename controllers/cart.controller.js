import ProductModel from "../models/product.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getOrCreateCart, enrichCartItems } from "../utils/cartHelpers.js";
import { ApiError } from "../utils/apiError.js";

export const getCart = asyncHandler(async (request, response) => {
  const cart = await getOrCreateCart(request.user._id);
  const items = await enrichCartItems(cart.items);

  response.json(items);
});

export const addToCart = asyncHandler(async (request, response) => {
  const productId = Number(request.body.productId ?? request.body.id);
  const quantity = Number(request.body.quantity) || 1;

  if (Number.isNaN(productId)) {
    throw new ApiError(400, "productId is required");
  }

  const product = await ProductModel.findOne({
    productId,
    isActive: true,
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const cart = await getOrCreateCart(request.user._id);
  const existingIndex = cart.items.findIndex(
    (item) => item.productId === productId,
  );

  if (existingIndex >= 0) {
    cart.items[existingIndex].quantity += quantity;
  } else {
    cart.items.push({ productId, quantity });
  }

  await cart.save();

  const items = await enrichCartItems(cart.items);

  response.status(201).json(items);
});

export const updateCartItem = asyncHandler(async (request, response) => {
  const productId = Number(request.params.id);
  const quantity = Number(request.body.quantity);

  if (Number.isNaN(productId)) {
    throw new ApiError(400, "Invalid cart item id");
  }

  if (Number.isNaN(quantity) || quantity < 1) {
    throw new ApiError(400, "Quantity must be at least 1");
  }

  const cart = await getOrCreateCart(request.user._id);
  const item = cart.items.find((entry) => entry.productId === productId);

  if (!item) {
    throw new ApiError(404, "Cart item not found");
  }

  item.quantity = quantity;
  await cart.save();

  const items = await enrichCartItems(cart.items);

  response.json(items);
});

export const removeCartItem = asyncHandler(async (request, response) => {
  const productId = Number(request.params.id);

  const cart = await getOrCreateCart(request.user._id);

  cart.items = cart.items.filter((item) => item.productId !== productId);
  await cart.save();

  const items = await enrichCartItems(cart.items);

  response.json(items);
});

export const replaceCart = asyncHandler(async (request, response) => {
  const { items } = request.body;

  if (!Array.isArray(items)) {
    throw new ApiError(400, "items must be an array");
  }

  const cart = await getOrCreateCart(request.user._id);

  cart.items = items
    .map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity) || 1,
    }))
    .filter((item) => !Number.isNaN(item.productId));

  await cart.save();

  const enriched = await enrichCartItems(cart.items);

  response.json(enriched);
});
