import mongoose from "mongoose";

const LICENSE_KEY_STATUS = ["available", "reserved", "sold", "revoked"];

const licenseKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    productId: {
      type: Number,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: LICENSE_KEY_STATUS,
      default: "available",
      index: true,
    },
    orderId: {
      type: String,
      default: null,
      index: true,
    },
    soldAt: {
      type: Date,
      default: null,
    },
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

licenseKeySchema.index({ productId: 1, status: 1 });

const LicenseKeyModel = mongoose.model("LicenseKey", licenseKeySchema);

export default LicenseKeyModel;
