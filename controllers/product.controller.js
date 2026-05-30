import ProductModel from "../models/product.model.js";
import CategoryModel from "../models/category.model.js";
import ReviewModel from "../models/review.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { formatProduct, formatReview } from "../utils/formatters.js";
import { ApiError } from "../utils/apiError.js";
import { getCategoryIdsWithDescendants } from "../utils/categoryHelpers.js";

export const getProducts = asyncHandler(async (request, response) => {
  const filter = { isActive: true };
  const { category, categoryId } = request.query;

  if (categoryId) {
    const ids = await getCategoryIdsWithDescendants(Number(categoryId));

    if (!Number.isNaN(ids[0])) {
      filter.categoryId = { $in: ids };
    }
  } else if (category) {
    const matched = await CategoryModel.findOne({
      slug: String(category).toLowerCase(),
      isActive: true,
    });

    if (matched) {
      const ids = await getCategoryIdsWithDescendants(matched.categoryId);
      filter.categoryId = { $in: ids };
    } else {
      filter.categoryId = -1;
    }
  }

  const { slug, q, minPrice, maxPrice } = request.query;

  if (slug) {
    const bySlug = await CategoryModel.findOne({
      slug: String(slug).toLowerCase(),
      isActive: true,
    });

    if (bySlug) {
      const ids = await getCategoryIdsWithDescendants(bySlug.categoryId);
      filter.categoryId = { $in: ids };
    } else {
      filter.categoryId = -1;
    }
  }

  let products = await ProductModel.find(filter).sort({
    productId: 1,
  });

  if (q) {
    const query = String(q).trim().toLowerCase();

    products = products.filter((product) => {
      const haystack =
        `${product.name} ${product.vendor} ${product.categoryName} ${product.description}`.toLowerCase();

      return haystack.includes(query);
    });
  }

  if (minPrice != null || maxPrice != null) {
    const min = Number(minPrice);
    const max = Number(maxPrice);

    products = products.filter((product) => {
      const sale =
        product.discountPrice != null &&
        product.discountPrice < product.price
          ? product.discountPrice
          : product.price;

      if (!Number.isNaN(min) && sale < min) return false;
      if (!Number.isNaN(max) && sale > max) return false;

      return true;
    });
  }

  response.json(products.map(formatProduct));
});

export const getProductById = asyncHandler(async (request, response) => {
  const param = request.params.id;
  const product = Number.isNaN(Number(param))
    ? await ProductModel.findOne({
        slug: String(param).toLowerCase(),
        isActive: true,
      })
    : await ProductModel.findOne({
        productId: Number(param),
        isActive: true,
      });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  response.json(formatProduct(product));
});

export const createProduct = asyncHandler(async (request, response) => {
  const lastProduct = await ProductModel.findOne().sort({ productId: -1 });
  const nextId = (lastProduct?.productId || 0) + 1;

  const product = await ProductModel.create({
    productId: nextId,
    ...request.body,
  });

  response.status(201).json(formatProduct(product));
});

export const updateProduct = asyncHandler(async (request, response) => {
  const productId = Number(request.params.id);

  const product = await ProductModel.findOneAndUpdate(
    { productId },
    request.body,
    { new: true, runValidators: true },
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  response.json(formatProduct(product));
});

export const deleteProduct = asyncHandler(async (request, response) => {
  const productId = Number(request.params.id);

  const product = await ProductModel.findOneAndUpdate(
    { productId },
    { isActive: false },
    { new: true },
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  response.json({ message: "Product removed" });
});

export const getProductReviews = asyncHandler(async (request, response) => {
  const productId = Number(request.params.id);

  const reviews = await ReviewModel.find({ productId }).sort({
    createdAt: -1,
  });

  response.json(reviews.map(formatReview));
});

export const createProductReview = asyncHandler(async (request, response) => {
  const productId = Number(request.params.id);
  const { rating, comment } = request.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const product = await ProductModel.findOne({ productId, isActive: true });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const review = await ReviewModel.findOneAndUpdate(
    { productId, user: request.user._id },
    {
      productId,
      user: request.user._id,
      userName: request.user.name,
      rating,
      comment: comment || "",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  response.status(201).json(formatReview(review));
});
