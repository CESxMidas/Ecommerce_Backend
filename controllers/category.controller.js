import CategoryModel from "../models/category.model.js";
import ProductModel from "../models/product.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { formatCategory, formatProduct } from "../utils/formatters.js";
import { ApiError, throwIfInvalid } from "../utils/apiError.js";
import { validateCategoryPayload } from "../validators/schema.validator.js";
import {
  buildCategoryTreeFromDb,
  getCategoryIdsWithDescendants,
  getProductCountMap,
  buildCategoryTree,
  rollupProductCounts,
} from "../utils/categoryHelpers.js";

async function assertValidParent(categoryId, parentId) {
  if (parentId == null || parentId === "") {
    return;
  }

  const normalizedParentId = Number(parentId);

  if (Number.isNaN(normalizedParentId)) {
    throw new ApiError(400, "Parent category ID is invalid");
  }

  if (categoryId != null && normalizedParentId === Number(categoryId)) {
    throw new ApiError(400, "Category cannot be its own parent");
  }

  const parent = await CategoryModel.findOne({ categoryId: normalizedParentId });

  if (!parent) {
    throw new ApiError(400, "Parent category not found");
  }

  if (categoryId == null) {
    return;
  }

  let current = parent;

  while (current?.parentId != null) {
    if (Number(current.parentId) === Number(categoryId)) {
      throw new ApiError(400, "Invalid parent category: would create a cycle");
    }

    current = await CategoryModel.findOne({ categoryId: current.parentId });
  }
}

function mapCategoriesWithCounts(categories, countMap) {
  return categories.map((category) => ({
    ...formatCategory(category),
    categoryId: category.categoryId,
    productCount: countMap[category.categoryId] || 0,
  }));
}

export const getCategories = asyncHandler(async (request, response) => {
  const flat = request.query.flat === "true";

  if (flat) {
    const categories = await CategoryModel.find({ isActive: true }).sort({
      sortOrder: 1,
      categoryId: 1,
    });
    const countMap = await getProductCountMap();

    return response.json(
      categories.map((category) => ({
        ...formatCategory(category),
        productCount: countMap[category.categoryId] || 0,
      })),
    );
  }

  const tree = await buildCategoryTreeFromDb();

  response.json(tree);
});

export const adminGetCategories = asyncHandler(async (request, response) => {
  const categories = await CategoryModel.find({}).sort({
    sortOrder: 1,
    categoryId: 1,
  });
  const countMap = await getProductCountMap();

  response.json(mapCategoriesWithCounts(categories, countMap));
});

export const getCategoryById = asyncHandler(async (request, response) => {
  const param = request.params.id;
  const category = Number.isNaN(Number(param))
    ? await CategoryModel.findOne({ slug: String(param).toLowerCase() })
    : await CategoryModel.findOne({ categoryId: Number(param) });

  if (!category || !category.isActive) {
    throw new ApiError(404, "Category not found");
  }

  const categoryIds = await getCategoryIdsWithDescendants(category.categoryId);

  const [children, products, countMap] = await Promise.all([
    CategoryModel.find({
      parentId: category.categoryId,
      isActive: true,
    }).sort({ sortOrder: 1, categoryId: 1 }),
    ProductModel.find({
      isActive: true,
      categoryId: { $in: categoryIds },
    }).sort({ productId: 1 }),
    getProductCountMap(),
  ]);

  const flatChildren = children.map((child) => ({
    ...formatCategory(child),
    productCount: countMap[child.categoryId] || 0,
  }));

  response.json({
    ...formatCategory(category),
    productCount: categoryIds.reduce(
      (sum, id) => sum + (countMap[id] || 0),
      0,
    ),
    children: rollupProductCounts(
      buildCategoryTree(flatChildren),
      countMap,
    ),
    products: products.map(formatProduct),
  });
});

export const createCategory = asyncHandler(async (request, response) => {
  throwIfInvalid(validateCategoryPayload(request.body));

  const { name, image } = request.body;

  if (!name?.trim()) {
    throw new ApiError(400, "Category name is required");
  }

  const slug = request.body.slug?.trim().toLowerCase();

  if (slug) {
    const existingSlug = await CategoryModel.findOne({ slug });
    if (existingSlug) {
      throw new ApiError(400, "Category slug already exists");
    }
  }

  await assertValidParent(null, request.body.parentId ?? null);

  const last = await CategoryModel.findOne().sort({ categoryId: -1 });
  const categoryId = (last?.categoryId || 0) + 1;

  const category = await CategoryModel.create({
    categoryId,
    name: name.trim(),
    slug: slug || `category-${categoryId}`,
    image: image || "",
    description: request.body.description || "",
    icon: request.body.icon || "default",
    parentId: request.body.parentId ?? null,
    sortOrder: request.body.sortOrder ?? categoryId,
    isActive: request.body.isActive !== false,
  });

  response.status(201).json(formatCategory(category));
});

export const updateCategory = asyncHandler(async (request, response) => {
  throwIfInvalid(validateCategoryPayload(request.body, { partial: true }));

  const categoryId = Number(request.params.id);
  const payload = { ...request.body };

  if (payload.slug != null) {
    payload.slug = String(payload.slug).trim().toLowerCase();

    const existingSlug = await CategoryModel.findOne({
      slug: payload.slug,
      categoryId: { $ne: categoryId },
    });

    if (existingSlug) {
      throw new ApiError(400, "Category slug already exists");
    }
  }

  if (payload.parentId !== undefined) {
    await assertValidParent(categoryId, payload.parentId ?? null);
  }

  const category = await CategoryModel.findOneAndUpdate(
    { categoryId },
    payload,
    { new: true, runValidators: true },
  );

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  response.json(formatCategory(category));
});

export const deleteCategory = asyncHandler(async (request, response) => {
  const categoryId = Number(request.params.id);

  const category = await CategoryModel.findOne({ categoryId });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  const childCount = await CategoryModel.countDocuments({
    parentId: categoryId,
    isActive: true,
  });

  if (childCount > 0) {
    throw new ApiError(
      400,
      "Cannot deactivate category while it still has active child categories",
    );
  }

  const productCount = await ProductModel.countDocuments({
    categoryId,
    isActive: true,
  });

  if (productCount > 0) {
    throw new ApiError(
      400,
      "Cannot deactivate category while it still has active products",
    );
  }

  const updated = await CategoryModel.findOneAndUpdate(
    { categoryId },
    { isActive: false },
    { new: true },
  );

  response.json({
    message: "Category deactivated",
    category: formatCategory(updated),
  });
});
