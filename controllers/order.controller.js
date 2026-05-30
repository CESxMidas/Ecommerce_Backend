import OrderModel from "../models/order.model.js";
import ProductModel from "../models/product.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { formatOrder, formatProduct } from "../utils/formatters.js";
import { ApiError, throwIfInvalid } from "../utils/apiError.js";
import { validatePlaceOrder } from "../validators/order.validator.js";
import { generateLicenseKeysForProduct } from "../utils/licenseKey.js";

function generateOrderId() {
  return String(Date.now()).slice(-5);
}

function generatePaymentId() {
  return `PAY${Date.now().toString().slice(-6)}`;
}

async function fulfillOrderItems(items = []) {
  if (!items.length) {
    return [];
  }

  const productIds = items.map((item) => Number(item.productId));
  const products = await ProductModel.find({
    productId: { $in: productIds },
    isActive: true,
  });

  const productMap = new Map(
    products.map((product) => [product.productId, product]),
  );

  const fulfilled = [];

  for (const item of items) {
    const dbProduct = productMap.get(Number(item.productId));
    const licenseKeys = dbProduct
      ? await generateLicenseKeysForProduct(dbProduct, item.quantity)
      : [];

    fulfilled.push({
      productId: item.productId,
      quantity: item.quantity,
      product: formatProduct(dbProduct || item.product),
      licenseKeys,
    });
  }

  return fulfilled;
}

export const getOrders = asyncHandler(async (request, response) => {
  const filter = { email: request.user.email };

  if (request.user.role === "ADMIN" && request.query.all === "true") {
    delete filter.email;
  }

  const orders = await OrderModel.find(filter).sort({ createdAt: -1 });

  response.json(orders.map(formatOrder));
});

export const getOrderById = asyncHandler(async (request, response) => {
  const order = await OrderModel.findOne({ orderId: request.params.id });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (
    request.user.role !== "ADMIN" &&
    order.email !== request.user.email
  ) {
    throw new ApiError(403, "Not allowed to view this order");
  }

  response.json(formatOrder(order));
});

export const createOrder = asyncHandler(async (request, response) => {
  throwIfInvalid(validatePlaceOrder(request.body));

  const {
    name,
    phone,
    address,
    pincode = "000000",
    total,
    email,
    userId,
    items = [],
    paymentMethod = "card",
  } = request.body;

  const fulfilledItems = await fulfillOrderItems(items);

  const order = await OrderModel.create({
    orderId: generateOrderId(),
    paymentId: generatePaymentId(),
    user: request.user?._id || null,
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim(),
    pincode: String(pincode),
    total: Number(total),
    email: (request.user?.email || email).trim().toLowerCase(),
    userId: userId || request.user?.email,
    status: "Delivered",
    paymentMethod,
    items: fulfilledItems,
  });

  response.status(201).json(formatOrder(order));
});

export const updateOrderStatus = asyncHandler(async (request, response) => {
  const { status } = request.body;
  const allowed = ["Pending", "Processing", "Delivered", "Cancelled"];

  if (!allowed.includes(status)) {
    throw new ApiError(400, "Invalid order status");
  }

  const order = await OrderModel.findOneAndUpdate(
    { orderId: request.params.id },
    { status },
    { new: true },
  );

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  response.json(formatOrder(order));
});
