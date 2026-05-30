import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0, default: null },
    images: { type: [String], default: [] },
    thumbnail: { type: String, default: "" },
    categoryId: { type: Number, default: null, index: true },
    categoryName: { type: String, default: "", trim: true },
    vendor: { type: String, default: "", trim: true },
    stock: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    badge: { type: String, default: "" },
    productType: {
      type: String,
      enum: ["standard", "license_key"],
      default: "standard",
    },
    keyPrefix: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ name: "text", description: "text", vendor: "text" });

const ProductModel = mongoose.model("Product", productSchema);

export default ProductModel;
