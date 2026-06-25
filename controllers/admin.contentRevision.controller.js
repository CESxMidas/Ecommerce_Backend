import ContentRevisionModel from "../models/contentRevision.model.js";
import { REVISION_STATUS } from "../constants/contentApproval.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { writeAuditLog } from "../utils/auditLog.js";
import {
  applyApprovedRevision,
  assertRevisionTransition,
  buildEntityLabel,
  buildRevisionSummary,
  canApproveContentRevision,
  canSubmitContentRevision,
  canViewReviewQueue,
  findLiveEntity,
  formatContentRevision,
  getPendingRevision,
  hashRevisionPayload,
  pickRevisionPayload,
  requiresApprovalWorkflow,
  supersedeOpenRevisions,
} from "../utils/contentApproval.js";
import { CONTENT_ENTITY_TYPES } from "../constants/contentApproval.js";

function actorFields(user) {
  return {
    name: user.name || user.email || "",
    role: user.role || "",
    id: user._id,
  };
}

export const adminListContentRevisions = asyncHandler(async (request, response) => {
  if (!canViewReviewQueue(request.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25));
  const skip = (page - 1) * limit;
  const filter = {};

  if (request.query.status) {
    filter.status = String(request.query.status);
  } else if (request.query.queue === "pending") {
    filter.status = REVISION_STATUS.PENDING_REVIEW;
  }

  if (request.query.entityType) {
    filter.entityType = String(request.query.entityType);
  }

  if (request.query.entityId) {
    filter.entityId = String(request.query.entityId);
  }

  if (request.query.submittedBy) {
    filter.submittedBy = request.query.submittedBy;
  }

  const [items, total] = await Promise.all([
    ContentRevisionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ContentRevisionModel.countDocuments(filter),
  ]);

  response.json({
    items: items.map(formatContentRevision),
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  });
});

export const adminGetContentRevision = asyncHandler(async (request, response) => {
  const revision = await ContentRevisionModel.findById(request.params.id);

  if (!revision) {
    throw new ApiError(404, "Revision not found");
  }

  if (
    !canViewReviewQueue(request.user) &&
    String(revision.submittedBy) !== String(request.user._id)
  ) {
    throw new ApiError(403, "Insufficient permissions");
  }

  response.json(formatContentRevision(revision));
});

export const adminCreateContentRevision = asyncHandler(async (request, response) => {
  const entityType = String(request.body.entityType || "");
  const entityId = String(request.body.entityId || "").trim();
  const changeType = request.body.changeType || "update";

  if (!CONTENT_ENTITY_TYPES.includes(entityType)) {
    throw new ApiError(400, "Invalid entity type");
  }

  if (!entityId && changeType !== "create") {
    throw new ApiError(400, "entityId is required");
  }

  if (!canSubmitContentRevision(request.user, entityType)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const payload = pickRevisionPayload(entityType, request.body.payload || request.body);

  if (Object.keys(payload).length === 0) {
    throw new ApiError(400, "Payload is empty");
  }

  const entity = entityId ? await findLiveEntity(entityType, entityId) : null;

  if (changeType !== "create" && !entity) {
    throw new ApiError(404, "Entity not found");
  }

  const pending = entityId ? await getPendingRevision(entityType, entityId) : null;

  if (pending) {
    throw new ApiError(
      409,
      "This entity already has a revision pending review",
    );
  }

  const entityLabel = buildEntityLabel(entityType, entity, payload);
  const summary =
    String(request.body.summary || "").trim() ||
    buildRevisionSummary(entityType, changeType, entityLabel);

  const revision = await ContentRevisionModel.create({
    entityType,
    entityId: entityId || "new",
    entityLabel,
    status: REVISION_STATUS.DRAFT,
    changeType,
    payload,
    payloadHash: hashRevisionPayload(payload),
    baseRevision: entity?.updatedAt || null,
    summary,
    submitNote: String(request.body.submitNote || "").trim(),
    submittedBy: request.user._id,
    submittedByName: actorFields(request.user).name,
    submittedByRole: request.user.role,
  });

  response.status(201).json(formatContentRevision(revision));
});

export const adminSubmitContentRevision = asyncHandler(async (request, response) => {
  const revision = await ContentRevisionModel.findById(request.params.id);

  if (!revision) {
    throw new ApiError(404, "Revision not found");
  }

  if (!canSubmitContentRevision(request.user, revision.entityType)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  if (
    String(revision.submittedBy) !== String(request.user._id) &&
    !canApproveContentRevision(request.user)
  ) {
    throw new ApiError(403, "Only the author or owner can submit this revision");
  }

  assertRevisionTransition(revision.status, REVISION_STATUS.PENDING_REVIEW);

  if (revision.entityId !== "new") {
    const pending = await getPendingRevision(
      revision.entityType,
      revision.entityId,
    );

    if (pending && String(pending._id) !== String(revision._id)) {
      throw new ApiError(409, "Another revision is already pending review");
    }
  }

  revision.status = REVISION_STATUS.PENDING_REVIEW;
  revision.submittedAt = new Date();
  revision.submitNote =
    String(request.body.submitNote || "").trim() || revision.submitNote;

  await revision.save();

  await writeAuditLog({
    actor: request.user,
    action: "content.submit_review",
    entityType: "content_revision",
    entityId: revision._id,
    summary: `Gửi duyệt: ${revision.summary}`,
    metadata: {
      targetEntityType: revision.entityType,
      targetEntityId: revision.entityId,
    },
  });

  response.json(formatContentRevision(revision));
});

export const adminApproveContentRevision = asyncHandler(async (request, response) => {
  if (!canApproveContentRevision(request.user)) {
    throw new ApiError(403, "Only owner can approve content revisions");
  }

  const revision = await ContentRevisionModel.findById(request.params.id);

  if (!revision) {
    throw new ApiError(404, "Revision not found");
  }

  assertRevisionTransition(revision.status, REVISION_STATUS.APPROVED);

  const liveEntity = await applyApprovedRevision(revision);

  revision.status = REVISION_STATUS.APPROVED;
  revision.reviewedBy = request.user._id;
  revision.reviewedByName = actorFields(request.user).name;
  revision.reviewedByRole = request.user.role;
  revision.reviewedAt = new Date();
  revision.approvedAt = new Date();
  revision.reviewNote = String(request.body.reviewNote || "").trim();

  if (revision.entityId === "new" && liveEntity?._id) {
    revision.entityId = String(liveEntity._id);
  }

  await revision.save();
  await supersedeOpenRevisions(revision.entityType, revision.entityId, revision._id);

  await writeAuditLog({
    actor: request.user,
    action: "content.approve",
    entityType: "content_revision",
    entityId: revision._id,
    summary: `Duyệt: ${revision.summary}`,
    metadata: {
      targetEntityType: revision.entityType,
      targetEntityId: revision.entityId,
    },
  });

  response.json({
    revision: formatContentRevision(revision),
    applied: true,
  });
});

export const adminRejectContentRevision = asyncHandler(async (request, response) => {
  if (!canApproveContentRevision(request.user)) {
    throw new ApiError(403, "Only owner can reject content revisions");
  }

  const revision = await ContentRevisionModel.findById(request.params.id);

  if (!revision) {
    throw new ApiError(404, "Revision not found");
  }

  const reviewNote = String(request.body.reviewNote || "").trim();

  if (!reviewNote) {
    throw new ApiError(400, "Review note is required when rejecting");
  }

  assertRevisionTransition(revision.status, REVISION_STATUS.REJECTED);

  revision.status = REVISION_STATUS.REJECTED;
  revision.reviewedBy = request.user._id;
  revision.reviewedByName = actorFields(request.user).name;
  revision.reviewedByRole = request.user.role;
  revision.reviewedAt = new Date();
  revision.reviewNote = reviewNote;

  await revision.save();

  await writeAuditLog({
    actor: request.user,
    action: "content.reject",
    entityType: "content_revision",
    entityId: revision._id,
    summary: `Từ chối: ${revision.summary}`,
    metadata: { reviewNote },
  });

  response.json(formatContentRevision(revision));
});

export const adminCancelContentRevision = asyncHandler(async (request, response) => {
  const revision = await ContentRevisionModel.findById(request.params.id);

  if (!revision) {
    throw new ApiError(404, "Revision not found");
  }

  const isAuthor = String(revision.submittedBy) === String(request.user._id);
  const isOwner = canApproveContentRevision(request.user);

  if (!isAuthor && !isOwner) {
    throw new ApiError(403, "Insufficient permissions");
  }

  assertRevisionTransition(revision.status, REVISION_STATUS.CANCELLED);

  revision.status = REVISION_STATUS.CANCELLED;
  await revision.save();

  response.json(formatContentRevision(revision));
});

/** Middleware-style helper: nếu cần workflow thì chặn update trực tiếp */
export function assertDirectPublishAllowed(user) {
  if (requiresApprovalWorkflow(user)) {
    throw new ApiError(
      403,
      "Changes must be submitted as a content revision for owner approval",
    );
  }
}
