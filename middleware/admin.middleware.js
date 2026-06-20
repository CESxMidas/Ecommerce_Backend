import { hasPermission, isStaffRole } from "../utils/permissions.js";

export function staffOnly(request, response, next) {
  if (!request.user) {
    return response.status(401).json({ message: "Not authorized" });
  }

  if (!isStaffRole(request.user.role)) {
    return response.status(403).json({ message: "Staff access required" });
  }

  next();
}

/** @deprecated Use staffOnly — kept for backward compatibility */
export function adminOnly(request, response, next) {
  return staffOnly(request, response, next);
}

export function requirePermission(permission) {
  return (request, response, next) => {
    if (!request.user) {
      return response.status(401).json({ message: "Not authorized" });
    }

    if (!isStaffRole(request.user.role)) {
      return response.status(403).json({ message: "Staff access required" });
    }

    if (!hasPermission(request.user.role, permission)) {
      return response.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

export function requireAnyPermission(...permissions) {
  return (request, response, next) => {
    if (!request.user) {
      return response.status(401).json({ message: "Not authorized" });
    }

    if (!isStaffRole(request.user.role)) {
      return response.status(403).json({ message: "Staff access required" });
    }

    const allowed = permissions.some((permission) =>
      hasPermission(request.user.role, permission),
    );

    if (!allowed) {
      return response.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}
