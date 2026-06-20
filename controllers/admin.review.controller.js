import ReviewModel from "../models/review.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { formatReview } from "../utils/formatters.js";
import { syncProductReviewStats } from "../utils/reviewHelpers.js";
import { writeAuditLog } from "../utils/auditLog.js";

function formatAdminReview(review) {
  return {
    ...formatReview(review),
    isHidden: Boolean(review.isHidden),
  };
}

export const adminGetProductReviews = asyncHandler(async (request, response) => {
  const productId = Number(request.params.productId);

  const reviews = await ReviewModel.find({ productId }).sort({
    createdAt: -1,
  });

  response.json(reviews.map(formatAdminReview));
});

export const adminUpdateReview = asyncHandler(async (request, response) => {
  const review = await ReviewModel.findById(request.params.id);

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  if (request.body.isHidden != null) {
    review.isHidden = Boolean(request.body.isHidden);
  }

  await review.save();
  await syncProductReviewStats(review.productId);

  await writeAuditLog({
    actor: request.user,
    action: review.isHidden ? "review.hide" : "review.unhide",
    entityType: "review",
    entityId: review._id,
    summary: `${review.isHidden ? "Ẩn" : "Hiện"} đánh giá SP #${review.productId} (${review.userName})`,
    metadata: { productId: review.productId, isHidden: review.isHidden },
  });

  response.json(formatAdminReview(review));
});

export const adminDeleteReview = asyncHandler(async (request, response) => {
  const review = await ReviewModel.findById(request.params.id);

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  const productId = review.productId;
  const userName = review.userName;

  await review.deleteOne();
  await syncProductReviewStats(productId);

  await writeAuditLog({
    actor: request.user,
    action: "review.delete",
    entityType: "review",
    entityId: request.params.id,
    summary: `Xóa đánh giá SP #${productId} (${userName})`,
    metadata: { productId },
  });

  response.json({ message: "Review deleted" });
});
