import BlogModel from "../models/blog.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

const BLOG_WRITABLE_FIELDS = new Set([
  "title",
  "description",
  "image",
  "category",
  "publishedAt",
  "isActive",
]);

function pickBlogPayload(body = {}) {
  return Object.entries(body).reduce((payload, [key, value]) => {
    if (BLOG_WRITABLE_FIELDS.has(key) && !key.startsWith("$")) {
      payload[key] = value;
    }

    return payload;
  }, {});
}

function validateBlogPayload(body, { partial = false } = {}) {
  if (!partial || body.title !== undefined) {
    const title = String(body.title || "").trim();
    if (!title) {
      throw new ApiError(400, "Title is required");
    }

    if (title.length > 180) {
      throw new ApiError(400, "Title must be 180 characters or less");
    }
  }

  if (body.description != null && String(body.description).length > 2000) {
    throw new ApiError(400, "Description must be 2000 characters or less");
  }

  if (body.category != null && String(body.category).length > 80) {
    throw new ApiError(400, "Category must be 80 characters or less");
  }
}

export const getBlogs = asyncHandler(async (request, response) => {
  const blogs = await BlogModel.find({ isActive: true }).sort({
    publishedAt: -1,
  });

  response.json(blogs);
});

export const getBlogById = asyncHandler(async (request, response) => {
  const blog = await BlogModel.findOne({
    _id: request.params.id,
    isActive: true,
  });

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  response.json(blog);
});

export const adminGetBlogs = asyncHandler(async (request, response) => {
  const blogs = await BlogModel.find().sort({ publishedAt: -1 });
  response.json(blogs);
});

export const createBlog = asyncHandler(async (request, response) => {
  validateBlogPayload(request.body);

  const payload = pickBlogPayload(request.body);

  if (!payload.title?.trim()) {
    throw new ApiError(400, "Title is required");
  }

  payload.title = payload.title.trim();
  payload.description = String(payload.description || "").trim();
  payload.category = String(payload.category || "Chung").trim() || "Chung";
  payload.image = String(payload.image || "").trim();
  payload.isActive = payload.isActive !== false;

  if (payload.publishedAt) {
    payload.publishedAt = new Date(payload.publishedAt);
  }

  const blog = await BlogModel.create(payload);
  response.status(201).json(blog);
});

export const updateBlog = asyncHandler(async (request, response) => {
  validateBlogPayload(request.body, { partial: true });

  const payload = pickBlogPayload(request.body);

  if (Object.keys(payload).length === 0) {
    throw new ApiError(400, "No valid blog fields to update");
  }

  if (payload.title != null) {
    payload.title = String(payload.title).trim();
  }

  if (payload.description != null) {
    payload.description = String(payload.description).trim();
  }

  if (payload.category != null) {
    payload.category = String(payload.category).trim() || "Chung";
  }

  if (payload.image != null) {
    payload.image = String(payload.image).trim();
  }

  if (payload.publishedAt != null) {
    payload.publishedAt = new Date(payload.publishedAt);
  }

  const blog = await BlogModel.findByIdAndUpdate(request.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  response.json(blog);
});

export const deleteBlog = asyncHandler(async (request, response) => {
  const blog = await BlogModel.findByIdAndUpdate(
    request.params.id,
    { isActive: false },
    { new: true },
  );

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  response.json({ message: "Blog deactivated", blog });
});
