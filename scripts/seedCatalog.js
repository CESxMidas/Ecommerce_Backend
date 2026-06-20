import dotenv from "dotenv";
import mongoose from "mongoose";

import CategoryModel from "../models/category.model.js";
import ProductModel from "../models/product.model.js";
import CouponModel from "../models/coupon.model.js";
import BannerModel from "../models/banner.model.js";
import BlogModel from "../models/blog.model.js";
import ReviewModel from "../models/review.model.js";
import { buildCategoryMap, normalizeSeedCategory, normalizeSeedProduct } from "../utils/dataNormalization.js";

dotenv.config();

function assertSeedAllowed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed catalog in production");
  }

  if (!process.argv.includes("--yes")) {
    throw new Error("Refusing to reset catalog without --yes");
  }
}

const categories = [
  {
    id: 1,
    name: "Sản phẩm số",
    slug: "digital-products",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
    description: "Key bản quyền, mã nạp, tài khoản và dịch vụ số",
    icon: "software",
    sortOrder: 1,
  },
  {
    id: 11,
    name: "Key bản quyền",
    slug: "license-keys",
    description: "Key phần mềm và ứng dụng giao ngay sau thanh toán",
    icon: "key",
    parentId: 1,
    sortOrder: 1,
  },
  {
    id: 12,
    name: "Mã nạp",
    slug: "redeem-codes",
    description: "Mã ví, game và quà tặng số",
    icon: "games",
    parentId: 1,
    sortOrder: 2,
  },
  {
    id: 13,
    name: "Tài khoản",
    slug: "accounts",
    description: "Tài khoản số và thông tin đăng nhập gói dịch vụ",
    icon: "user",
    parentId: 1,
    sortOrder: 3,
  },
  {
    id: 14,
    name: "Dịch vụ thủ công",
    slug: "manual-services",
    description: "Dịch vụ xử lý bởi đội hỗ trợ sau thanh toán",
    icon: "support",
    parentId: 1,
    sortOrder: 4,
  },
  {
    id: 2,
    name: "Phần cứng",
    slug: "hardware",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop",
    description: "Máy tính, thiết bị, linh kiện và phụ kiện",
    icon: "hardware",
    sortOrder: 2,
  },
  {
    id: 21,
    name: "Máy tính",
    slug: "computers",
    description: "Laptop, mini PC và máy bàn",
    icon: "hardware",
    parentId: 2,
    sortOrder: 1,
  },
  {
    id: 22,
    name: "Linh kiện",
    slug: "components",
    description: "SSD, RAM và linh kiện nâng cấp",
    icon: "hardware",
    parentId: 2,
    sortOrder: 2,
  },
  {
    id: 23,
    name: "Phụ kiện",
    slug: "accessories",
    description: "Bàn phím, chuột và phụ kiện hàng ngày",
    icon: "hardware",
    parentId: 2,
    sortOrder: 3,
  },
];

const products = [
  {
    id: 1,
    sku: "KEY-WIN11-PRO",
    name: "Key bản quyền Windows 11 Pro",
    description:
      "Key kích hoạt Windows 11 Pro cho một thiết bị. Giao key ngay sau khi xác nhận thanh toán VNPay.",
    price: 1490000,
    discountPrice: 690000,
    currency: "VND",
    categoryId: 11,
    vendor: "Microsoft",
    badge: "Nổi bật",
    tags: ["Windows", "Key bản quyền", "Giao ngay"],
    seoTitle: "Key Windows 11 Pro chính hãng — giao ngay sau VNPay",
    seoDescription:
      "Mua key kích hoạt Windows 11 Pro giá tốt. Giao key tức thì sau khi thanh toán VNPay được xác nhận.",
    productType: "license_key",
    deliveryType: "instant_key",
    keyPrefix: "WIN11",
    stock: 240,
    rating: 4.8,
    reviewsCount: 18,
    images: [
      "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?q=80&w=1200&auto=format&fit=crop",
    ],
    attributes: {
      platform: "Windows",
      validity: "Kích hoạt vĩnh viễn",
      delivery: "Giao key ngay sau thanh toán",
    },
  },
  {
    id: 2,
    sku: "KEY-KASP-1Y",
    name: "Kaspersky Premium Security 1 năm",
    description: "Key kích hoạt bảo mật Kaspersky Premium cho PC và thiết bị di động.",
    price: 990000,
    discountPrice: 490000,
    currency: "VND",
    categoryId: 11,
    vendor: "Kaspersky",
    badge: "Bảo mật",
    tags: ["Antivirus", "Key bản quyền", "1 năm"],
    seoTitle: "Key Kaspersky Premium Security 1 năm",
    seoDescription:
      "Key bảo mật Kaspersky Premium cho PC và di động. Kích hoạt nhanh sau thanh toán online.",
    productType: "license_key",
    deliveryType: "instant_key",
    keyPrefix: "KASP",
    stock: 180,
    rating: 4.6,
    reviewsCount: 12,
    images: [
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1200&auto=format&fit=crop",
    ],
    attributes: {
      duration: "1 năm",
      devices: "1 thiết bị",
    },
  },
  {
    id: 3,
    sku: "KEY-CERBERUS-PUBGM",
    name: "Key bản quyền CERBERUS Bypass",
    description:
      "Key CERBERUS bypass hỗ trợ một số khu vực PUBG Mobile. Kích hoạt nhanh sau thanh toán.",
    price: 990000,
    discountPrice: 590000,
    currency: "VND",
    categoryId: 11,
    vendor: "CERBERUS",
    badge: "Bypass",
    tags: ["PUBG Mobile", "Key bản quyền", "Game"],
    seoTitle: "Key CERBERUS Bypass PUBG Mobile",
    seoDescription:
      "Key CERBERUS bypass PUBG Mobile, kích hoạt nhanh sau thanh toán VNPay.",
    productType: "license_key",
    deliveryType: "instant_key",
    keyPrefix: "CERBERUS",
    stock: 120,
    rating: 4.7,
    reviewsCount: 26,
    images: ["/images/bypass/cerberus-banner.png"],
    attributes: {
      game: "PUBG Mobile",
      delivery: "Key bản quyền",
    },
  },
  {
    id: 4,
    sku: "CODE-STEAM-20",
    name: "Mã nạp Steam Wallet 500.000đ",
    description: "Mã nạp Steam Wallet dùng mua game, DLC và vật phẩm trong game.",
    price: 550000,
    discountPrice: 500000,
    currency: "VND",
    categoryId: 12,
    vendor: "Steam",
    badge: "Mã nạp",
    tags: ["Steam", "Ví game", "Mã nạp"],
    seoTitle: "Mã nạp Steam Wallet 500.000đ",
    seoDescription:
      "Mua mã nạp Steam Wallet 500.000đ, dùng mua game và vật phẩm trên Steam.",
    productType: "redeem_code",
    deliveryType: "instant_key",
    keyPrefix: "STEAM",
    stock: 300,
    rating: 4.9,
    reviewsCount: 44,
    images: [
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: 5,
    sku: "CODE-GAME-GIFT",
    name: "Mã quà tặng game toàn cầu",
    description: "Mã quà tặng số cho các cửa hàng game được hỗ trợ. Kèm hướng dẫn đổi sau thanh toán.",
    price: 890000,
    discountPrice: 690000,
    currency: "VND",
    categoryId: 12,
    vendor: "GamePass",
    badge: "Quà tặng",
    tags: ["Game", "Mã quà tặng", "Toàn cầu"],
    seoTitle: "Mã quà tặng game toàn cầu",
    seoDescription:
      "Mã quà tặng số cho các cửa hàng game được hỗ trợ, kèm hướng dẫn đổi sau thanh toán.",
    productType: "redeem_code",
    deliveryType: "instant_key",
    keyPrefix: "GIFT",
    stock: 160,
    rating: 4.5,
    reviewsCount: 10,
    images: [
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: 6,
    sku: "ACC-O365-LIFE",
    name: "Tài khoản Office 365 trọn đời",
    description: "Thông tin đăng nhập Office 365 do hỗ trợ giao sau xác minh thanh toán.",
    price: 2490000,
    discountPrice: 1190000,
    currency: "VND",
    categoryId: 13,
    vendor: "Microsoft",
    badge: "Tài khoản",
    tags: ["Microsoft", "Office 365", "Trọn đời"],
    seoTitle: "Tài khoản Office 365 trọn đời",
    seoDescription:
      "Tài khoản Office 365 trọn đời, giao thông tin đăng nhập sau xác minh thanh toán.",
    productType: "account",
    deliveryType: "account_credentials",
    stock: 80,
    rating: 4.4,
    reviewsCount: 21,
    images: [
      "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?q=80&w=1200&auto=format&fit=crop",
    ],
    attributes: {
      delivery: "Thông tin tài khoản",
      handlingTime: "Trong vòng 30 phút",
    },
  },
  {
    id: 7,
    sku: "ACC-CANVA-PRO",
    name: "Tài khoản Canva Pro Team",
    description: "Quyền truy cập Canva Pro do đội hỗ trợ chuẩn bị sau thanh toán online.",
    price: 590000,
    discountPrice: 350000,
    currency: "VND",
    categoryId: 13,
    vendor: "Canva",
    badge: "Tài khoản",
    tags: ["Canva", "Thiết kế", "Pro Team"],
    seoTitle: "Tài khoản Canva Pro Team",
    seoDescription:
      "Quyền truy cập Canva Pro Team, chuẩn bị bởi hỗ trợ sau thanh toán online.",
    productType: "account",
    deliveryType: "account_credentials",
    stock: 70,
    rating: 4.3,
    reviewsCount: 9,
    images: [
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: 8,
    sku: "SRV-ACTIVATION",
    name: "Hỗ trợ kích hoạt phần mềm từ xa",
    description: "Đội hỗ trợ giúp kích hoạt phần mềm hợp lệ từ xa sau khi thanh toán VNPay.",
    price: 450000,
    discountPrice: 290000,
    currency: "VND",
    categoryId: 14,
    vendor: "KEYSHOP Support",
    badge: "Dịch vụ",
    tags: ["Kích hoạt", "Hỗ trợ từ xa", "Phần mềm"],
    seoTitle: "Hỗ trợ kích hoạt phần mềm từ xa",
    seoDescription:
      "Dịch vụ kích hoạt phần mềm hợp lệ từ xa sau khi thanh toán VNPay thành công.",
    productType: "manual_service",
    deliveryType: "manual_delivery",
    stock: 50,
    rating: 4.6,
    reviewsCount: 7,
    images: [
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
    ],
    attributes: {
      handlingTime: "Trong ngày",
      channel: "Ticket hoặc email",
    },
  },
  {
    id: 9,
    sku: "SRV-PUBGM-CONFIG",
    name: "Dịch vụ cấu hình giả lập PUBG Mobile",
    description: "Dịch vụ cài đặt và tối ưu cấu hình giả lập PUBG Mobile thủ công.",
    price: 750000,
    discountPrice: 490000,
    currency: "VND",
    categoryId: 14,
    vendor: "KEYSHOP Support",
    badge: "Dịch vụ",
    tags: ["PUBG Mobile", "Giả lập", "Cấu hình"],
    seoTitle: "Dịch vụ cấu hình giả lập PUBG Mobile",
    seoDescription:
      "Dịch vụ cài đặt và tối ưu giả lập PUBG Mobile thủ công sau thanh toán.",
    productType: "manual_service",
    deliveryType: "manual_delivery",
    stock: 40,
    rating: 4.5,
    reviewsCount: 14,
    images: ["/images/bypass/snake-app.png"],
  },
  {
    id: 10,
    sku: "HW-LAPTOP-AIR13",
    name: "Ultrabook Air 13 tân trang",
    description:
      "Laptop compact tân trang cho văn phòng, học tập và lập trình nhẹ. Hỗ trợ COD.",
    price: 12490000,
    discountPrice: 10690000,
    currency: "VND",
    categoryId: 21,
    vendor: "KEYSHOP Hardware",
    badge: "COD",
    tags: ["Laptop", "Ultrabook", "Thanh toán COD"],
    seoTitle: "Ultrabook Air 13 tân trang — hỗ trợ COD",
    seoDescription:
      "Laptop compact tân trang cho văn phòng và học tập. Thanh toán VNPay hoặc COD.",
    productType: "hardware",
    deliveryType: "physical",
    requiresOnlinePayment: false,
    stock: 8,
    rating: 4.4,
    reviewsCount: 6,
    images: [
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1200&auto=format&fit=crop",
    ],
    variants: [
      {
        id: "space-gray",
        name: "Xám không gian",
        price: 10690000,
        listPrice: 12490000,
        color: "#4b5563",
      },
      {
        id: "silver",
        name: "Bạc",
        price: 10690000,
        listPrice: 12490000,
        color: "#d1d5db",
      },
      {
        id: "midnight",
        name: "Đen midnight",
        price: 10990000,
        listPrice: 12790000,
        color: "#111827",
      },
    ],
    weight: 1.3,
    dimensions: { length: 30, width: 21, height: 2 },
  },
  {
    id: 11,
    sku: "HW-SSD-1TB",
    name: "SSD NVMe 1TB",
    description: "SSD NVMe 1TB tốc độ cao cho laptop và PC. Hỗ trợ COD.",
    price: 2190000,
    discountPrice: 1690000,
    currency: "VND",
    categoryId: 22,
    vendor: "KingSpec",
    badge: "COD",
    tags: ["SSD", "NVMe", "Linh kiện PC"],
    seoTitle: "SSD NVMe 1TB tốc độ cao — hỗ trợ COD",
    seoDescription:
      "SSD NVMe 1TB cho laptop và PC, giao hàng vật lý. Thanh toán VNPay hoặc COD.",
    productType: "hardware",
    deliveryType: "physical",
    requiresOnlinePayment: false,
    stock: 24,
    rating: 4.7,
    reviewsCount: 16,
    images: [
      "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?q=80&w=1200&auto=format&fit=crop",
    ],
    variants: [
      {
        id: "black",
        name: "Đen",
        price: 1690000,
        listPrice: 2190000,
        color: "#111827",
      },
      {
        id: "blue",
        name: "Xanh",
        price: 1720000,
        listPrice: 2220000,
        color: "#2563eb",
      },
      {
        id: "silver",
        name: "Bạc",
        price: 1750000,
        listPrice: 2250000,
        color: "#d1d5db",
      },
    ],
    weight: 0.08,
  },
  {
    id: 12,
    sku: "HW-KB-MECH",
    name: "Bàn phím cơ compact",
    description: "Bàn phím cơ hot-swap compact cho game và làm việc. Hỗ trợ COD.",
    price: 1990000,
    discountPrice: 1490000,
    currency: "VND",
    categoryId: 23,
    vendor: "KeyLab",
    badge: "COD",
    tags: ["Bàn phím cơ", "Hot-swap", "Phụ kiện game"],
    seoTitle: "Bàn phím cơ compact — hỗ trợ COD",
    seoDescription:
      "Bàn phím cơ hot-swap compact cho game và làm việc. Thanh toán VNPay hoặc COD.",
    productType: "hardware",
    deliveryType: "physical",
    requiresOnlinePayment: false,
    stock: 18,
    rating: 4.6,
    reviewsCount: 13,
    images: [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=1200&auto=format&fit=crop",
    ],
    variants: [
      {
        id: "black",
        name: "Đen",
        price: 1490000,
        listPrice: 1990000,
        color: "#111827",
      },
      {
        id: "white",
        name: "Trắng",
        price: 1490000,
        listPrice: 1990000,
        color: "#f8fafc",
      },
      {
        id: "pink",
        name: "Hồng",
        price: 1540000,
        listPrice: 2040000,
        color: "#f9a8d4",
      },
    ],
    weight: 0.7,
  },
];

const coupons = [
  {
    code: "WELCOME10",
    type: "percent",
    value: 10,
    minOrder: 200000,
    maxDiscount: 200000,
    usageLimit: 200,
    expiresAt: new Date("2027-12-31T23:59:59.000Z"),
  },
  {
    code: "DIGITAL5",
    type: "fixed",
    value: 50000,
    minOrder: 250000,
    usageLimit: 150,
    expiresAt: new Date("2027-12-31T23:59:59.000Z"),
  },
  {
    code: "HARDWARE15",
    type: "percent",
    value: 15,
    minOrder: 1000000,
    maxDiscount: 1500000,
    usageLimit: 80,
    expiresAt: new Date("2027-12-31T23:59:59.000Z"),
  },
];

const banners = [
  {
    title: "Giao key ngay sau VNPay",
    subtitle: "Key bản quyền và mã nạp chỉ hiển thị sau khi thanh toán được xác nhận.",
    image: "/images/bypass/cerberus-banner.png",
    link: "/products?category=license-keys",
    placement: "home_slider",
    sortOrder: 1,
  },
  {
    title: "Tài khoản số an toàn",
    subtitle: "Sản phẩm tài khoản được chuẩn bị bởi hỗ trợ sau thanh toán online.",
    image: "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?q=80&w=1200&auto=format&fit=crop",
    link: "/products?category=accounts",
    placement: "home_slider",
    sortOrder: 2,
  },
  {
    title: "Phần cứng hỗ trợ COD",
    subtitle: "Máy tính, linh kiện và phụ kiện có thể thanh toán VNPay hoặc COD.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop",
    link: "/products?category=hardware",
    placement: "ads",
    sortOrder: 1,
  },
];

const blogs = [
  {
    title: "Quy trình giao hàng số hoạt động thế nào",
    description:
      "Key và mã nạp chỉ hiển thị sau khi thanh toán online được xác nhận để đảm bảo an toàn.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
    category: "Hướng dẫn",
  },
  {
    title: "Key, mã nạp, tài khoản và dịch vụ khác nhau thế nào?",
    description: "Hướng dẫn ngắn về từng nhóm sản phẩm và cách khách hàng nhận hàng.",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop",
    category: "Hướng dẫn",
  },
  {
    title: "Khi nào được thanh toán COD",
    description: "COD chỉ áp dụng phần cứng vật lý; sản phẩm số yêu cầu VNPay.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop",
    category: "Chính sách",
  },
];

async function resetCollections() {
  await Promise.all([
    ProductModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    CouponModel.deleteMany({}),
    BannerModel.deleteMany({}),
    BlogModel.deleteMany({}),
    ReviewModel.deleteMany({}),
  ]);
}

async function seed() {
  assertSeedAllowed();

  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required");
  }

  await mongoose.connect(process.env.MONGODB_URL);

  await resetCollections();

  const normalizedCategories = categories.map(normalizeSeedCategory);
  await CategoryModel.insertMany(normalizedCategories);

  const categoryMap = buildCategoryMap(normalizedCategories);
  const normalizedProducts = products.map((product) =>
    normalizeSeedProduct(product, categoryMap),
  );

  await ProductModel.insertMany(normalizedProducts);
  await CouponModel.insertMany(coupons);
  await BannerModel.insertMany(banners);
  await BlogModel.insertMany(blogs);

  console.log("Catalog seed complete");
  console.log(`Categories: ${normalizedCategories.length}`);
  console.log(`Products: ${normalizedProducts.length}`);
  console.log(`Coupons: ${coupons.length}`);
  console.log(`Banners: ${banners.length}`);
  console.log(`Blogs: ${blogs.length}`);
}

seed()
  .catch((error) => {
    console.error("Catalog seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
