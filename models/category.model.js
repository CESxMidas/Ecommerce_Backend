import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    icon: { type: String, default: "default" },
    parentId: { type: Number, default: null, index: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const CategoryModel = mongoose.model("Category", categorySchema);

export default CategoryModel;
