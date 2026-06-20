import AuditLogModel from "../models/auditLog.model.js";

export async function writeAuditLog({
  actor,
  action,
  entityType,
  entityId = "",
  summary,
  metadata = {},
}) {
  if (!actor?._id || !action || !entityType || !summary) {
    return null;
  }

  try {
    return await AuditLogModel.create({
      actor: actor._id,
      actorName: actor.name || actor.email || "",
      actorRole: actor.role || "",
      action,
      entityType,
      entityId: String(entityId),
      summary,
      metadata,
    });
  } catch {
    return null;
  }
}
