/** Workflow duyệt nội dung — hằng số dùng chung BE/FE */

/** Loại thực thể hỗ trợ duyệt */
export const CONTENT_ENTITY_TYPES = [
  "product",
  "category",
  "banner",
  "blog",
  "coupon",
];

/** Trạng thái một bản revision */
export const REVISION_STATUS = {
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  SUPERSEDED: "superseded",
};

/** Trạng thái có thể lọc trên queue duyệt */
export const OPEN_REVISION_STATUSES = [
  REVISION_STATUS.DRAFT,
  REVISION_STATUS.PENDING_REVIEW,
  REVISION_STATUS.REJECTED,
];

/** Chuyển trạng thái hợp lệ */
export const REVISION_TRANSITIONS = {
  [REVISION_STATUS.DRAFT]: [
    REVISION_STATUS.PENDING_REVIEW,
    REVISION_STATUS.CANCELLED,
  ],
  [REVISION_STATUS.PENDING_REVIEW]: [
    REVISION_STATUS.APPROVED,
    REVISION_STATUS.REJECTED,
    REVISION_STATUS.CANCELLED,
  ],
  [REVISION_STATUS.REJECTED]: [
    REVISION_STATUS.DRAFT,
    REVISION_STATUS.PENDING_REVIEW,
    REVISION_STATUS.CANCELLED,
  ],
  [REVISION_STATUS.APPROVED]: [],
  [REVISION_STATUS.CANCELLED]: [],
  [REVISION_STATUS.SUPERSEDED]: [],
};

/** Quyền RBAC (bổ sung permissions.js) */
export const CONTENT_APPROVAL_PERMISSIONS = {
  SUBMIT: "content.submit",
  APPROVE: "content.approve",
  VIEW_QUEUE: "content.review_queue",
};

/** Map entityType → permission quản lý tương ứng */
export const ENTITY_MANAGE_PERMISSION = {
  product: "products.manage",
  category: "categories.manage",
  banner: "banners.manage",
  blog: "blogs.manage",
  coupon: "coupons.manage",
};

/** Trường payload được phép theo từng loại (whitelist chống mass-assignment) */
export const ENTITY_PAYLOAD_FIELDS = {
  product: [
    "name",
    "slug",
    "description",
    "sku",
    "price",
    "discountPrice",
    "currency",
    "images",
    "thumbnail",
    "categoryId",
    "categoryName",
    "vendor",
    "tags",
    "attributes",
    "variants",
    "stock",
    "badge",
    "productType",
    "deliveryType",
    "requiresOnlinePayment",
    "keyPrefix",
    "weight",
    "dimensions",
    "seoTitle",
    "seoDescription",
    "isActive",
  ],
  category: [
    "name",
    "slug",
    "image",
    "description",
    "icon",
    "parentId",
    "sortOrder",
    "isActive",
  ],
  banner: [
    "title",
    "subtitle",
    "image",
    "link",
    "placement",
    "sortOrder",
    "isActive",
  ],
  blog: [
    "title",
    "description",
    "image",
    "category",
    "publishedAt",
    "isActive",
  ],
  coupon: [
    "code",
    "type",
    "value",
    "minOrder",
    "maxDiscount",
    "usageLimit",
    "expiresAt",
    "isActive",
  ],
};
