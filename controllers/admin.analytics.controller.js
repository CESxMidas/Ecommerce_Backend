import OrderModel from "../models/order.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

function parseDateInput(value, { endOfDay = false } = {}) {
  if (!value) return null;

  const date = new Date(endOfDay ? `${value}T23:59:59.999` : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Invalid date filter");
  }

  return date;
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function buildPaidMatch(from, to) {
  return {
    paymentStatus: "paid",
    createdAt: { $gte: from, $lte: to },
  };
}

async function summarizePeriod(from, to) {
  const match = buildPaidMatch(from, to);

  const [summaryAgg, totalOrders] = await Promise.all([
    OrderModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          paidOrders: { $sum: 1 },
        },
      },
    ]),
    OrderModel.countDocuments({ createdAt: { $gte: from, $lte: to } }),
  ]);

  const revenue = summaryAgg[0]?.revenue || 0;
  const paidOrders = summaryAgg[0]?.paidOrders || 0;
  const aov = paidOrders > 0 ? Math.round(revenue / paidOrders) : 0;

  return { revenue, paidOrders, totalOrders, aov };
}

export const getAnalyticsOverview = asyncHandler(async (request, response) => {
  const parsedFrom = parseDateInput(request.query.from);
  const parsedTo = parseDateInput(request.query.to, { endOfDay: true });
  const defaults = defaultRange();
  const from = parsedFrom || defaults.from;
  const to = parsedTo || defaults.to;

  if (from > to) {
    throw new ApiError(400, "Start date must be before end date");
  }

  const periodMs = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - periodMs);
  previousFrom.setHours(0, 0, 0, 0);

  const [current, previous, revenueByDay, topProducts] = await Promise.all([
    summarizePeriod(from, to),
    summarizePeriod(previousFrom, previousTo),
    OrderModel.aggregate([
      { $match: buildPaidMatch(from, to) },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    OrderModel.aggregate([
      { $match: buildPaidMatch(from, to) },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.product.name" },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const revenueChangePercent =
    previous.revenue > 0
      ? Number((((current.revenue - previous.revenue) / previous.revenue) * 100).toFixed(1))
      : current.revenue > 0
        ? 100
        : 0;

  response.json({
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    summary: {
      revenue: current.revenue,
      paidOrders: current.paidOrders,
      totalOrders: current.totalOrders,
      aov: current.aov,
      previousRevenue: previous.revenue,
      previousPaidOrders: previous.paidOrders,
      revenueChangePercent,
    },
    revenueByDay: revenueByDay.map((row) => ({
      date: row._id,
      revenue: row.revenue,
      orders: row.orders,
    })),
    topProducts: topProducts.map((row) => ({
      productId: row._id,
      name: row.name || `SP #${row._id}`,
      quantity: row.quantity,
      revenue: row.revenue,
    })),
  });
});
