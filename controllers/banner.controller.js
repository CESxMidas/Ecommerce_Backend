import BannerModel from "../models/banner.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { writeAuditLog } from "../utils/auditLog.js";

const BANNER_WRITABLE_FIELDS = new Set([
  "title",
  "subtitle",
  "image",
  "link",
  "placement",
  "sortOrder",
  "isActive",
]);

function pickBannerPayload(body = {}) {
  return Object.entries(body).reduce((payload, [key, value]) => {
    if (BANNER_WRITABLE_FIELDS.has(key) && !key.startsWith("$")) {
      payload[key] = value;
    }

    return payload;
  }, {});
}

export const getBanners = asyncHandler(async (request, response) => {
  const filter = { isActive: true };

  if (request.query.placement) {
    filter.placement = request.query.placement;
  }

  const banners = await BannerModel.find(filter).sort({
    sortOrder: 1,
    createdAt: -1,
  });

  response.json(banners);
});

export const adminGetBanners = asyncHandler(async (request, response) => {
  const banners = await BannerModel.find().sort({ sortOrder: 1, createdAt: -1 });
  response.json(banners);
});

export const createBanner = asyncHandler(async (request, response) => {
  const payload = pickBannerPayload(request.body);

  if (!payload.title?.trim() || !payload.image?.trim()) {
    throw new ApiError(400, "Title and image are required");
  }

  payload.title = payload.title.trim();
  payload.subtitle = String(payload.subtitle || "").trim();
  payload.image = payload.image.trim();
  payload.link = String(payload.link || "").trim();
  payload.placement = payload.placement || "home_slider";
  payload.sortOrder = Number(payload.sortOrder ?? 0);
  payload.isActive = payload.isActive !== false;

  const banner = await BannerModel.create(payload);

  await writeAuditLog({
    actor: request.user,
    action: "banner.create",
    entityType: "banner",
    entityId: banner._id,
    summary: `Tạo banner: ${banner.title}`,
    metadata: { placement: banner.placement },
  });

  response.status(201).json(banner);
});

export const updateBanner = asyncHandler(async (request, response) => {
  const payload = pickBannerPayload(request.body);

  if (Object.keys(payload).length === 0) {
    throw new ApiError(400, "No valid banner fields to update");
  }

  if (payload.title != null) {
    payload.title = String(payload.title).trim();
    if (!payload.title) {
      throw new ApiError(400, "Title is required");
    }
  }

  if (payload.image != null) {
    payload.image = String(payload.image).trim();
    if (!payload.image) {
      throw new ApiError(400, "Image is required");
    }
  }

  if (payload.subtitle != null) {
    payload.subtitle = String(payload.subtitle).trim();
  }

  if (payload.link != null) {
    payload.link = String(payload.link).trim();
  }

  if (payload.sortOrder != null) {
    payload.sortOrder = Number(payload.sortOrder);
  }

  const banner = await BannerModel.findByIdAndUpdate(request.params.id, payload, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!banner) {
    throw new ApiError(404, "Banner not found");
  }

  await writeAuditLog({
    actor: request.user,
    action: "banner.update",
    entityType: "banner",
    entityId: banner._id,
    summary: `Cập nhật banner: ${banner.title}`,
    metadata: { fields: Object.keys(payload) },
  });

  response.json(banner);
});

export const deleteBanner = asyncHandler(async (request, response) => {
  const banner = await BannerModel.findByIdAndUpdate(
    request.params.id,
    { isActive: false },
    { returnDocument: "after" },
  );

  if (!banner) {
    throw new ApiError(404, "Banner not found");
  }

  await writeAuditLog({
    actor: request.user,
    action: "banner.deactivate",
    entityType: "banner",
    entityId: banner._id,
    summary: `Ngừng banner: ${banner.title}`,
  });

  response.json({ message: "Banner deactivated", banner });
});
