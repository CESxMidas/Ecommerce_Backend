import mongoose from "mongoose";

import {
  CONTENT_ENTITY_TYPES,
  REVISION_STATUS,
} from "../constants/contentApproval.js";

/**
 * Bản nháp / yêu cầu duyệt thay đổi nội dung shop.
 *
 * Luồng:
 * - MANAGER/STAFF lưu draft → gửi pending_review
 * - OWNER approve → áp payload lên document live + status approved
 * - OWNER reject → rejected + reviewNote, người gửi sửa và gửi lại
 *
 * Document live (Product, Blog, …) chỉ đổi khi duyệt — storefront không đọc revision.
 */
const contentRevisionSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: CONTENT_ENTITY_TYPES,
      index: true,
    },
    /** productId/categoryId (số) hoặc _id Mongo (banner/blog/coupon) */
    entityId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    /** Nhãn hiển thị: tên SP, tiêu đề blog… */
    entityLabel: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: Object.values(REVISION_STATUS),
      default: REVISION_STATUS.DRAFT,
      index: true,
    },
    /** create | update | deactivate */
    changeType: {
      type: String,
      enum: ["create", "update", "deactivate"],
      default: "update",
    },
    /** Toàn bộ field sẽ ghi đè lên entity khi approve (đã whitelist) */
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    /** Snapshot updatedAt của entity lúc tạo revision — optimistic lock */
    baseRevision: { type: Date, default: null },
    summary: { type: String, default: "", trim: true },
    submitNote: { type: String, default: "", trim: true },
    reviewNote: { type: String, default: "", trim: true },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    submittedByName: { type: String, default: "" },
    submittedByRole: { type: String, default: "" },
    submittedAt: { type: Date, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    reviewedByName: { type: String, default: "" },
    reviewedByRole: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    /** Hash đơn giản để phát hiện payload trùng */
    payloadHash: { type: String, default: "" },
  },
  { timestamps: true },
);

contentRevisionSchema.index({ status: 1, createdAt: -1 });
contentRevisionSchema.index({ entityType: 1, entityId: 1, status: 1 });
contentRevisionSchema.index(
  { entityType: 1, entityId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: REVISION_STATUS.PENDING_REVIEW },
  },
);

const ContentRevisionModel = mongoose.model(
  "ContentRevision",
  contentRevisionSchema,
);

export default ContentRevisionModel;
