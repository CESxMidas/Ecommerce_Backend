import mongoose from "mongoose";

const orderProductSnapshotSchema = new mongoose.Schema(
  {
    id: mongoose.Schema.Types.Mixed,
    name: String,
    slug: String,
    description: String,
    price: Number,
    discountPrice: Number,
    images: [String],
    thumbnail: String,
    categoryId: String,
    categoryName: String,
    vendor: String,
    stock: Number,
    rating: Number,
    reviewsCount: Number,
    isActive: Boolean,
    createdAt: Date,
    title: String,
    brand: String,
    image: String,
    oldPrice: Number,
    tag: String,
    discount: String,
  },
  { _id: false },
);

const orderItemSchema = new mongoose.Schema(
  {
    productId: Number,
    quantity: Number,
    product: orderProductSnapshotSchema,
    licenseKeys: { type: [String], default: [] },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    pincode: { type: String, default: "000000" },
    total: { type: Number, required: true },
    email: { type: String, required: true },
    userId: { type: String, default: "guest" },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Delivered", "Cancelled"],
      default: "Pending",
    },
    paymentMethod: { type: String, default: "card" },
    items: [orderItemSchema],
  },
  { timestamps: true },
);

const OrderModel = mongoose.model("Order", orderSchema);

export default OrderModel;
