import { getSalePriceFromDoc, resolvePricing } from "./dataNormalization.js";

const DIGITAL_PRODUCT_TYPES = new Set([
  "license_key",
  "redeem_code",
  "account",
  "manual_service",
]);

const DEFAULT_DURATION_VARIANTS = [
  { id: "daily", name: "Key ngay", duration: "daily" },
  { id: "monthly", name: "Key thang", duration: "monthly" },
  { id: "yearly", name: "Key nam", duration: "yearly" },
];

export function isVariantProduct(product) {
  return (
    (Array.isArray(product?.variants) && product.variants.length > 0) ||
    DIGITAL_PRODUCT_TYPES.has(product?.productType)
  );
}

function normalizeVariant(raw, fallbackPrice) {
  const id = String(raw?.id || raw?.code || raw?.name || "").trim();
  const name = String(raw?.name || raw?.label || id).trim();
  const price = Number(raw?.price ?? raw?.salePrice ?? fallbackPrice);
  const listPrice = raw?.listPrice != null ? Number(raw.listPrice) : null;
  const color = raw?.color ? String(raw.color).trim() : "";

  if (!id || !name || Number.isNaN(price) || price < 0) {
    return null;
  }

  return {
    id,
    name,
    price,
    listPrice: listPrice != null && !Number.isNaN(listPrice) ? listPrice : null,
    duration: raw?.duration || id,
    color: color || null,
  };
}

export function normalizeProductVariants(variants = [], fallbackPrice = 0) {
  if (!Array.isArray(variants)) {
    return [];
  }

  return variants
    .map((variant) => normalizeVariant(variant, fallbackPrice))
    .filter(Boolean);
}

export function getPurchaseVariants(product) {
  if (!isVariantProduct(product)) {
    return [];
  }

  const baseSalePrice = getSalePriceFromDoc(product);
  const { price: baseListPrice } = resolvePricing(product);
  const customVariants = normalizeProductVariants(product?.variants, baseSalePrice);

  if (customVariants.length > 0) {
    return customVariants;
  }

  if (product?.productType === "hardware" || product?.deliveryType === "physical") {
    return [];
  }

  return DEFAULT_DURATION_VARIANTS.map((variant) => {
    const price =
      variant.id === "daily"
        ? Math.max(0, Math.round(baseSalePrice / 30))
        : variant.id === "yearly"
          ? Math.round(baseSalePrice * 10)
          : baseSalePrice;

    return {
      ...variant,
      price,
      listPrice: variant.id === "monthly" && baseListPrice > baseSalePrice ? baseListPrice : null,
    };
  });
}

export function resolvePurchaseVariant(product, requestedVariant) {
  const variants = getPurchaseVariants(product);

  if (variants.length === 0) {
    return null;
  }

  const requestedId =
    typeof requestedVariant === "string"
      ? requestedVariant
      : requestedVariant?.id;

  return (
    variants.find((variant) => variant.id === requestedId) ||
    variants[0]
  );
}
