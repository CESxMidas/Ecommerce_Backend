import mongoose from "mongoose";

const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
      immutable: true,
    },
    siteName: { type: String, default: "KEYSHOP", trim: true },
    logoAlt: { type: String, default: "KEYSHOP", trim: true },
    logoUrl: { type: String, default: "" },
    faviconUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

const SiteSettingsModel = mongoose.model("SiteSettings", siteSettingsSchema);

export default SiteSettingsModel;
