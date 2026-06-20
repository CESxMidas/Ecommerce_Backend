import AuditLogModel from "../models/auditLog.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function formatAuditLog(entry) {
  return {
    id: entry._id,
    actorName: entry.actorName,
    actorRole: entry.actorRole,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    summary: entry.summary,
    metadata: entry.metadata || {},
    createdAt: entry.createdAt,
  };
}

export const adminGetAuditLogs = asyncHandler(async (request, response) => {
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25));
  const skip = (page - 1) * limit;
  const filter = {};

  if (request.query.action) {
    filter.action = String(request.query.action);
  }

  if (request.query.entityType) {
    filter.entityType = String(request.query.entityType);
  }

  if (request.query.q) {
    const query = String(request.query.q).trim();
    if (query) {
      filter.summary = { $regex: query, $options: "i" };
    }
  }

  const [items, total] = await Promise.all([
    AuditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLogModel.countDocuments(filter),
  ]);

  response.json({
    items: items.map(formatAuditLog),
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  });
});
