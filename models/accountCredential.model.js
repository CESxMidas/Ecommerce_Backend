import mongoose from "mongoose";

const ACCOUNT_CREDENTIAL_STATUS = ["available", "reserved", "sold", "revoked"];

const accountCredentialSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    productId: {
      type: Number,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ACCOUNT_CREDENTIAL_STATUS,
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

accountCredentialSchema.index({ productId: 1, status: 1 });
accountCredentialSchema.index(
  { productId: 1, username: 1 },
  { unique: true },
);

const AccountCredentialModel = mongoose.model(
  "AccountCredential",
  accountCredentialSchema,
);

export default AccountCredentialModel;
