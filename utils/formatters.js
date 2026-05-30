import {
  computeDiscountPercent,
  getSalePriceFromDoc,
  resolvePricing,
  sanitizeImageUrls,
} from "./dataNormalization.js";

export function computeDiscount(oldPrice, price) {
  return computeDiscountPercent(oldPrice, price);
}

export function formatProduct(product) {
  if (!product) {
    return null;
  }

  const doc = product.toObject ? product.toObject() : product;
  const name = doc.name || doc.title || "";
  const { price, discountPrice } = resolvePricing(doc);
  const salePrice = getSalePriceFromDoc(doc);
  const listPrice = discountPrice != null ? price : null;
  const thumbnail =
    doc.thumbnail || doc.image || doc.images?.[0] || "";
  const images = sanitizeImageUrls(
    doc.images?.length ? doc.images : [thumbnail],
  );
  const categoryId =
    doc.categoryId != null ? String(doc.categoryId) : "";
  const vendor = doc.vendor || doc.brand || "";
  const badge = doc.badge || doc.tag || "";
  const createdAt = doc.createdAt
    ? new Date(doc.createdAt).toISOString()
    : new Date().toISOString();

  const canonical = {
    id: doc.productId ?? doc.id,
    name,
    slug: doc.slug || "",
    description: doc.description || "",
    price,
    discountPrice: discountPrice ?? undefined,
    images,
    thumbnail: thumbnail || images[0] || "",
    categoryId,
    categoryName: doc.categoryName || "",
    vendor,
    stock: Number(doc.stock ?? 0),
    rating: Number(doc.rating ?? 0),
    reviewsCount: Number(doc.reviewsCount ?? 0),
    isActive: doc.isActive !== false,
    createdAt,
    badge,
    salePrice,
    listPrice,
    productType: doc.productType || "standard",
    keyPrefix: doc.keyPrefix || "",
  };

  return {
    ...canonical,
    brand: vendor,
    title: name,
    image: canonical.thumbnail,
    oldPrice: listPrice ?? 0,
    tag: badge,
    discount: computeDiscountPercent(price, salePrice),
  };
}

export function formatCategory(category) {
  if (!category) {
    return null;
  }

  const doc = category.toObject ? category.toObject() : category;
  const id = String(doc.categoryId ?? doc.id ?? "");

  return {
    id,
    name: doc.name,
    slug: doc.slug,
    image: doc.image || "",
    description: doc.description || "",
    icon: doc.icon || "default",
    parentId:
      doc.parentId != null && doc.parentId !== ""
        ? String(doc.parentId)
        : null,
    sortOrder: doc.sortOrder ?? 0,
    isActive: doc.isActive !== false,
  };
}

export function formatAuthUser(user, token) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.mobile || "",
    avatar: user.avatar || "",
    token,
  };
}

export function formatProfile(user) {
  return {
    name: user.name,
    email: user.email,
    phone: user.mobile || "",
  };
}

export function formatOrder(order) {
  const doc = order.toObject ? order.toObject() : order;

  return {
    id: doc.orderId,
    paymentId: doc.paymentId,
    name: doc.name,
    phone: doc.phone,
    address: doc.address,
    pincode: doc.pincode,
    total: doc.total,
    email: doc.email,
    userId: doc.userId,
    status: doc.status,
    items: (doc.items || []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      licenseKeys: item.licenseKeys || [],
      product: item.product ? formatProduct(item.product) : item.product,
    })),
    paymentMethod: doc.paymentMethod,
    createdAt: doc.createdAt,
  };
}

export function formatAddress(address) {
  const doc = address.toObject ? address.toObject() : address;

  return {
    id: doc._id,
    address_line: doc.address_line,
    city: doc.city,
    state: doc.state,
    pincode: doc.pincode,
    country: doc.country,
    mobile: doc.mobile,
    status: doc.status,
  };
}

export function formatReview(review) {
  const doc = review.toObject ? review.toObject() : review;

  return {
    id: doc._id,
    productId: doc.productId,
    userName: doc.userName,
    rating: doc.rating,
    comment: doc.comment,
    createdAt: doc.createdAt,
  };
}

export function formatCartItem(item) {
  return {
    productId: item.productId,
    quantity: item.quantity,
    product: formatProduct(item.product),
  };
}
