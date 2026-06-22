/**
 * Production category hierarchy — single source of truth.
 *
 * 2 parent roots, 6 children. No "Dịch vụ hỗ trợ".
 */
export const PRODUCTION_CATEGORIES = [
  {
    categoryId: 100,
    name: "Phần mềm & Bản quyền",
    slug: "phan-mem-ban-quyen",
    description: "Key bản quyền, tài khoản premium và thẻ nạp số",
    icon: "software",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
    parentId: null,
    sortOrder: 1,
    isActive: true,
  },
  {
    categoryId: 101,
    name: "Key / Mã bản quyền",
    slug: "key-ma-ban-quyen",
    description: "Windows, Office, antivirus, VPN và phần mềm bản quyền",
    icon: "security",
    parentId: 100,
    sortOrder: 1,
    isActive: true,
  },
  {
    categoryId: 102,
    name: "Tài khoản Premium / Pro",
    slug: "tai-khoan-premium-pro",
    description: "Canva, ChatGPT, Netflix, Spotify, YouTube Premium…",
    icon: "cloud",
    parentId: 100,
    sortOrder: 2,
    isActive: true,
  },
  {
    categoryId: 103,
    name: "Thẻ nạp / Mã nạp game",
    slug: "the-nap-ma-nap-game",
    description: "Steam, Garena, Google Play, Apple Gift Card, Roblox…",
    icon: "games",
    parentId: 100,
    sortOrder: 3,
    isActive: true,
  },
  {
    categoryId: 200,
    name: "Phần cứng & Thiết bị",
    slug: "phan-cung-thiet-bi",
    description: "Máy tính, linh kiện và phụ kiện công nghệ",
    icon: "hardware",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop",
    parentId: null,
    sortOrder: 2,
    isActive: true,
  },
  {
    categoryId: 201,
    name: "Máy tính / Laptop",
    slug: "may-tinh-laptop",
    description: "Laptop văn phòng, gaming, PC và mini PC",
    icon: "hardware",
    parentId: 200,
    sortOrder: 1,
    isActive: true,
  },
  {
    categoryId: 202,
    name: "Linh kiện máy tính",
    slug: "linh-kien-may-tinh",
    description: "RAM, SSD, CPU, GPU, mainboard, PSU…",
    icon: "hardware",
    parentId: 200,
    sortOrder: 2,
    isActive: true,
  },
  {
    categoryId: 203,
    name: "Phụ kiện & Ngoại vi",
    slug: "phu-kien-ngoai-vi",
    description: "Chuột, bàn phím, tai nghe, webcam, màn hình…",
    icon: "hardware",
    parentId: 200,
    sortOrder: 3,
    isActive: true,
  },
];

/** Legacy categoryId → new categoryId (null = deactivate product) */
export const LEGACY_CATEGORY_REMAP = {
  1: 100,
  11: 101,
  13: 102,
  12: 103,
  2: 200,
  21: 201,
  22: 202,
  23: 203,
  14: null,
};

export const LEGACY_CATEGORY_IDS = Object.keys(LEGACY_CATEGORY_REMAP).map(Number);

export const CATEGORY_NAME_BY_ID = new Map(
  PRODUCTION_CATEGORIES.map((category) => [category.categoryId, category.name]),
);
