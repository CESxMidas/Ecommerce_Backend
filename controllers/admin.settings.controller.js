import SiteSettingsModel from "../models/siteSettings.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { writeAuditLog } from "../utils/auditLog.js";

const SETTINGS_KEY = "global";
const WRITABLE_FIELDS = new Set(["siteName", "logoAlt", "logoUrl", "faviconUrl"]);

function formatSiteSettings(doc) {
  return {
    siteName: doc.siteName || "KEYSHOP",
    logoAlt: doc.logoAlt || "KEYSHOP",
    logoUrl: doc.logoUrl || "",
    faviconUrl: doc.faviconUrl || "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

async function getOrCreateSettings() {
  let settings = await SiteSettingsModel.findOne({ key: SETTINGS_KEY });

  if (!settings) {
    settings = await SiteSettingsModel.create({ key: SETTINGS_KEY });
  }

  return settings;
}

export const getPublicSiteSettings = asyncHandler(async (request, response) => {
  const settings = await getOrCreateSettings();
  response.json(formatSiteSettings(settings));
});

export const adminGetSiteSettings = asyncHandler(async (request, response) => {
  const settings = await getOrCreateSettings();
  response.json(formatSiteSettings(settings));
});

export const adminUpdateSiteSettings = asyncHandler(async (request, response) => {
  const payload = Object.entries(request.body).reduce((result, [key, value]) => {
    if (WRITABLE_FIELDS.has(key) && !key.startsWith("$")) {
      result[key] = value;
    }

    return result;
  }, {});

  if (Object.keys(payload).length === 0) {
    throw new ApiError(400, "No valid settings fields to update");
  }

  if (payload.siteName != null) {
    payload.siteName = String(payload.siteName).trim();
    if (!payload.siteName) {
      throw new ApiError(400, "Site name is required");
    }
  }

  if (payload.logoAlt != null) {
    payload.logoAlt = String(payload.logoAlt).trim();
  }

  if (payload.logoUrl != null) {
    payload.logoUrl = String(payload.logoUrl).trim();
  }

  if (payload.faviconUrl != null) {
    payload.faviconUrl = String(payload.faviconUrl).trim();
  }

  const settings = await SiteSettingsModel.findOneAndUpdate(
    { key: SETTINGS_KEY },
    payload,
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );

  await writeAuditLog({
    actor: request.user,
    action: "settings.update",
    entityType: "settings",
    entityId: SETTINGS_KEY,
    summary: `Cập nhật cài đặt shop (${Object.keys(payload).join(", ")})`,
    metadata: { fields: Object.keys(payload) },
  });

  response.json(formatSiteSettings(settings));
});
