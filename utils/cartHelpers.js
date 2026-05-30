import ProductModel from "../models/product.model.js";
import CartModel from "../models/cart.model.js";
import { formatProduct } from "./formatters.js";

export async function getOrCreateCart(userId) {
  let cart = await CartModel.findOne({ user: userId });

  if (!cart) {
    cart = await CartModel.create({ user: userId, items: [] });
  }

  return cart;
}

export async function enrichCartItems(items) {
  if (!items?.length) {
    return [];
  }

  const productIds = items.map((item) => item.productId);
  const products = await ProductModel.find({
    productId: { $in: productIds },
    isActive: true,
  });

  const productMap = new Map(
    products.map((product) => [product.productId, product]),
  );

  return items
    .map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        return null;
      }

      return {
        productId: item.productId,
        quantity: item.quantity,
        product: formatProduct(product),
      };
    })
    .filter(Boolean);
}
