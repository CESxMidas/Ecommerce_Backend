import { slugify } from "./slugify.js";

const URL_PATTERN = /^https?:\/\/.+/i;
const LOCAL_IMAGE_PATTERN = /^\/(images|assets)\/.+/i;

export function isValidImageUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();

  return URL_PATTERN.test(trimmed) || LOCAL_IMAGE_PATTERN.test(trimmed);
}

export function sanitizeImageUrls(urls = []) {
  const unique = [];

  urls.forEach((url) => {
    const trimmed = typeof url === "string" ? url.trim() : "";

    if (isValidImageUrl(trimmed) && !unique.includes(trimmed)) {
      unique.push(trimmed);
    }
  });

  return unique;
}

export function computeDiscountPercent(listPrice, salePrice) {
  const list = Number(listPrice);
  const sale = Number(salePrice);

  if (!list || list <= sale) {
    return undefined;
  }

  return `-${Math.round(((list - sale) / list) * 100)}%`;
}

export function resolvePricing(raw = {}) {
  let price = Number(raw.price);
  let discountPrice =
    raw.discountPrice != null ? Number(raw.discountPrice) : undefined;

  if (raw.oldPrice != null && raw.title && !raw.name) {
    price = Number(raw.oldPrice);
    discountPrice = Number(raw.price);
  }

  if (Number.isNaN(price) || price < 0) {
    price = 0;
  }

  if (
    discountPrice != null &&
    (Number.isNaN(discountPrice) || discountPrice < 0)
  ) {
    discountPrice = undefined;
  }

  if (discountPrice != null && discountPrice >= price) {
    discountPrice = undefined;
  }

  return { price, discountPrice };
}

export function getSalePriceFromDoc(doc) {
  const { price, discountPrice } = resolvePricing(doc);

  return discountPrice != null ? discountPrice : price;
}

export function buildCategoryMap(categories = []) {
  return new Map(
    categories.map((category) => [
      Number(category.categoryId ?? category.id),
      category,
    ]),
  );
}

export function normalizeSeedCategory(raw) {
  const categoryId = Number(raw.categoryId ?? raw.id);

  return {
    categoryId,
    name: String(raw.name || "").trim(),
    slug: slugify(raw.slug || raw.name || `category-${categoryId}`),
    image: isValidImageUrl(raw.image) ? raw.image.trim() : "",
    description: String(raw.description || "").trim(),
    icon: String(raw.icon || "default").trim(),
    parentId:
      raw.parentId != null && raw.parentId !== ""
        ? Number(raw.parentId)
        : null,
    sortOrder: Number(raw.sortOrder ?? categoryId) || categoryId,
    isActive: raw.isActive !== false,
  };
}

export function normalizeSeedProduct(raw, categoryMap = new Map()) {
  const productId = Number(raw.id ?? raw.productId);
  const categoryId = Number(raw.categoryId);
  const category = categoryMap.get(categoryId);
  const { price, discountPrice } = resolvePricing(raw);

  const name = String(raw.name || raw.title || "").trim();
  const thumbnailSource =
    raw.thumbnail || raw.image || raw.images?.[0] || category?.image || "";
  const thumbnail = isValidImageUrl(thumbnailSource)
    ? thumbnailSource.trim()
    : "";
  const images = sanitizeImageUrls(
    Array.isArray(raw.images)
      ? raw.images
      : [thumbnail, raw.image].filter(Boolean),
  );

  const finalThumbnail = thumbnail || images[0] || "";
  const finalImages =
    images.length > 0
      ? images
      : finalThumbnail
        ? [finalThumbnail]
        : [];

  return {
    productId,
    name,
    slug: slugify(raw.slug || name || `product-${productId}`),
    description: String(
      raw.description ||
        `${name} — genuine digital license with instant email delivery.`,
    ).trim(),
    price,
    discountPrice,
    images: finalImages,
    thumbnail: finalThumbnail,
    categoryId: Number.isNaN(categoryId) ? null : categoryId,
    categoryName: String(
      raw.categoryName || category?.name || "",
    ).trim(),
    vendor: String(raw.vendor || raw.brand || categoryNameFallback(raw)).trim(),
    stock: Math.max(0, Number(raw.stock ?? 99) || 0),
    rating: clamp(Number(raw.rating ?? 4.5) || 4.5, 0, 5),
    reviewsCount: Math.max(0, Number(raw.reviewsCount ?? 0) || 0),
    badge: String(raw.badge || raw.tag || "").trim(),
    productType: raw.productType === "license_key" ? "license_key" : "standard",
    keyPrefix: String(raw.keyPrefix || "").trim().toUpperCase(),
    isActive: raw.isActive !== false,
  };
}

function categoryNameFallback(raw) {
  return raw.categoryName || "Digital";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function dedupeProductsByKey(products, keyFn = (item) => item.productId) {
  const seen = new Set();

  return products.filter((item) => {
    const key = keyFn(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
