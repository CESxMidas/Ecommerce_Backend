export const STAFF_ROLES = ["OWNER", "MANAGER", "STAFF", "ADMIN"];
export const OWNER_ROLES = ["OWNER", "ADMIN"];
export const INTERNAL_STAFF_ROLES = ["OWNER", "MANAGER", "STAFF", "ADMIN"];
export const ASSIGNABLE_STAFF_ROLES = ["MANAGER", "STAFF"];

export const PERMISSIONS = {
  "dashboard.view": ["OWNER", "MANAGER", "STAFF"],
  "dashboard.revenue": ["OWNER"],
  "reports.view": ["OWNER"],
  "orders.manage": ["OWNER", "MANAGER", "STAFF"],
  "products.manage": ["OWNER", "MANAGER"],
  "categories.manage": ["OWNER", "MANAGER"],
  "keys.manage": ["OWNER", "MANAGER", "STAFF"],
  "banners.manage": ["OWNER", "MANAGER"],
  "blogs.manage": ["OWNER", "MANAGER"],
  "coupons.manage": ["OWNER", "MANAGER"],
  "customers.view": ["OWNER"],
  "customers.manage": ["OWNER"],
  "staff.manage": ["OWNER"],
  "settings.manage": ["OWNER"],
  "tickets.manage": ["OWNER", "MANAGER", "STAFF"],
  "reviews.manage": ["OWNER", "MANAGER"],
  "audit.view": ["OWNER"],
  "profile.view": ["OWNER", "MANAGER", "STAFF"],
  "content.submit": ["OWNER", "MANAGER", "STAFF"],
  "content.approve": ["OWNER"],
  "content.review_queue": ["OWNER", "MANAGER"],
};

export function normalizeRole(role) {
  return role === "ADMIN" ? "OWNER" : role;
}

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function isOwnerRole(role) {
  return OWNER_ROLES.includes(role);
}

export function isInternalStaffRole(role) {
  return INTERNAL_STAFF_ROLES.includes(role);
}

export function hasPermission(role, permission) {
  const allowed = PERMISSIONS[permission];

  if (!allowed || !role) {
    return false;
  }

  const effectiveRole = normalizeRole(role);
  return allowed.includes(effectiveRole);
}
