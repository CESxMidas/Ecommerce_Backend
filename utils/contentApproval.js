import crypto from "crypto";

import BannerModel from "../models/banner.model.js";
import BlogModel from "../models/blog.model.js";
import CategoryModel from "../models/category.model.js";
import CouponModel from "../models/coupon.model.js";
import ContentRevisionModel from "../models/contentRevision.model.js";
import ProductModel from "../models/product.model.js";
import {
  CONTENT_ENTITY_TYPES,
  ENTITY_MANAGE_PERMISSION,
  ENTITY_PAYLOAD_FIELDS,
  REVISION_STATUS,
  REVISION_TRANSITIONS,
} from "../constants/contentApproval.js";
import { hasPermission, isOwnerRole } from "./permissions.js";
import { ApiError } from "./apiError.js";

const MODEL_BY_ENTITY = {
  product: ProductModel,
  category: CategoryModel,
  banner: BannerModel,
  blog: BlogModel,
  coupon: CouponModel,
};

/** OWNER publish trực tiếp; MANAGER/STAFF phải qua revision */
export function requiresApprovalWorkflow(user) {
  return Boolean(user && !isOwnerRole(user.role));
}

export function canSubmitContentRevision(user, entityType) {
  if (!user || !CONTENT_ENTITY_TYPES.includes(entityType)) {
    return false;
  }

  const managePermission = ENTITY_MANAGE_PERMISSION[entityType];
  return (
    hasPermission(user.role, "content.submit") &&
    hasPermission(user.role, managePermission)
  );
}

export function canApproveContentRevision(user) {
  return hasPermission(user?.role, "content.approve");
}

export function canViewReviewQueue(user) {
  return (
    canApproveContentRevision(user) ||
    hasPermission(user?.role, "content.review_queue")
  );
}

export function assertRevisionTransition(currentStatus, nextStatus) {
  const allowed = REVISION_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    throw new ApiError(
      400,
      `Cannot transition revision from ${currentStatus} to ${nextStatus}`,
    );
  }
}

export function pickRevisionPayload(entityType, body = {}) {
  const allowed = new Set(ENTITY_PAYLOAD_FIELDS[entityType] || []);

  return Object.entries(body).reduce((result, [key, value]) => {
    if (allowed.has(key) && !key.startsWith("$")) {
      result[key] = value;
    }

    return result;
  }, {});
}

export function hashRevisionPayload(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 16);
}

export function getEntityModel(entityType) {
  return MODEL_BY_ENTITY[entityType] || null;
}

export async function findLiveEntity(entityType, entityId) {
  const Model = getEntityModel(entityType);

  if (!Model) {
    throw new ApiError(400, "Unsupported entity type");
  }

  if (entityType === "product" || entityType === "category") {
    const numericId = Number(entityId);
    const field = entityType === "product" ? "productId" : "categoryId";
    return Model.findOne({ [field]: numericId });
  }

  return Model.findById(entityId);
}

export function buildEntityLabel(entityType, entity, payload = {}) {
  if (entityType === "product") {
    return payload.name || entity?.name || `SP #${entity?.productId || ""}`;
  }

  if (entityType === "category") {
    return payload.name || entity?.name || `DM #${entity?.categoryId || ""}`;
  }

  if (entityType === "banner") {
    return payload.title || entity?.title || "Banner";
  }

  if (entityType === "blog") {
    return payload.title || entity?.title || "Bài viết";
  }

  if (entityType === "coupon") {
    return payload.code || entity?.code || "Mã giảm giá";
  }

  return "";
}

export function buildRevisionSummary(entityType, changeType, entityLabel) {
  const label = entityLabel || entityType;
  const prefix =
    changeType === "create"
      ? "Tạo mới"
      : changeType === "deactivate"
        ? "Ngừng"
        : "Cập nhật";

  const typeVi = {
    product: "sản phẩm",
    category: "danh mục",
    banner: "banner",
    blog: "bài viết",
    coupon: "mã giảm giá",
  }[entityType];

  return `${prefix} ${typeVi}: ${label}`;
}

export async function getPendingRevision(entityType, entityId) {
  return ContentRevisionModel.findOne({
    entityType,
    entityId: String(entityId),
    status: REVISION_STATUS.PENDING_REVIEW,
  });
}

export async function supersedeOpenRevisions(entityType, entityId, exceptId = null) {
  const filter = {
    entityType,
    entityId: String(entityId),
    status: { $in: [REVISION_STATUS.DRAFT, REVISION_STATUS.REJECTED] },
  };

  if (exceptId) {
    filter._id = { $ne: exceptId };
  }

  await ContentRevisionModel.updateMany(filter, {
    $set: { status: REVISION_STATUS.SUPERSEDED },
  });
}

/**
 * Áp payload lên document live sau khi OWNER duyệt.
 * Trả về document đã lưu.
 */
export async function applyApprovedRevision(revision) {
  const { entityType, entityId, payload, changeType } = revision;
  const Model = getEntityModel(entityType);

  if (!Model) {
    throw new ApiError(400, "Unsupported entity type");
  }

  if (changeType === "create") {
    if (entityType === "product" || entityType === "category") {
      throw new ApiError(400, "Create flow must create live entity before revision");
    }

    return Model.create(payload);
  }

  const entity = await findLiveEntity(entityType, entityId);

  if (!entity) {
    throw new ApiError(404, "Entity not found for approved revision");
  }

  if (
    revision.baseRevision &&
    entity.updatedAt &&
    new Date(entity.updatedAt).getTime() > new Date(revision.baseRevision).getTime()
  ) {
    throw new ApiError(
      409,
      "Entity was modified after this revision was created. Please review again.",
    );
  }

  if (changeType === "deactivate") {
    entity.isActive = false;
    await entity.save();
    return entity;
  }

  Object.assign(entity, payload);
  await entity.save();
  return entity;
}

export function formatContentRevision(doc) {
  const entry = doc.toObject ? doc.toObject() : doc;

  return {
    id: String(entry._id),
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityLabel: entry.entityLabel || "",
    status: entry.status,
    changeType: entry.changeType || "update",
    payload: entry.payload || {},
    baseRevision: entry.baseRevision
      ? new Date(entry.baseRevision).toISOString()
      : null,
    summary: entry.summary || "",
    submitNote: entry.submitNote || "",
    reviewNote: entry.reviewNote || "",
    submittedBy: entry.submittedBy ? String(entry.submittedBy) : null,
    submittedByName: entry.submittedByName || "",
    submittedByRole: entry.submittedByRole || "",
    submittedAt: entry.submittedAt
      ? new Date(entry.submittedAt).toISOString()
      : null,
    reviewedBy: entry.reviewedBy ? String(entry.reviewedBy) : null,
    reviewedByName: entry.reviewedByName || "",
    reviewedByRole: entry.reviewedByRole || "",
    reviewedAt: entry.reviewedAt
      ? new Date(entry.reviewedAt).toISOString()
      : null,
    approvedAt: entry.approvedAt
      ? new Date(entry.approvedAt).toISOString()
      : null,
    createdAt: entry.createdAt
      ? new Date(entry.createdAt).toISOString()
      : null,
    updatedAt: entry.updatedAt
      ? new Date(entry.updatedAt).toISOString()
      : null,
  };
}
