import TicketModel from "../models/ticket.model.js";
import NotificationModel from "../models/notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { writeAuditLog } from "../utils/auditLog.js";

const VALID_STATUSES = new Set(["open", "pending", "resolved", "closed"]);
const VALID_PRIORITIES = new Set(["low", "normal", "high"]);

function formatAdminTicket(ticket) {
  const user = ticket.user && typeof ticket.user === "object" ? ticket.user : null;

  return {
    id: ticket._id,
    userId: user?._id || ticket.user,
    userName: user?.name || "Khách hàng",
    userEmail: user?.email || "",
    orderId: ticket.orderId || "",
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    priority: ticket.priority,
    replies: (ticket.replies || []).map((reply) => ({
      id: reply._id,
      authorRole: reply.authorRole,
      message: reply.message,
      createdAt: reply.createdAt,
    })),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

async function notifyTicketUser(userId, payload) {
  try {
    await NotificationModel.create({
      user: userId,
      type: payload.type || "support",
      title: payload.title,
      message: payload.message || "",
      data: payload.data || {},
    });
  } catch {
    // Non-blocking
  }
}

export const adminGetTickets = asyncHandler(async (request, response) => {
  const { status, priority, q } = request.query;
  const filter = {};

  if (status && status !== "all" && VALID_STATUSES.has(status)) {
    filter.status = status;
  }

  if (priority && priority !== "all" && VALID_PRIORITIES.has(priority)) {
    filter.priority = priority;
  }

  if (q) {
    const query = String(q).trim();
    if (query) {
      filter.$or = [
        { subject: { $regex: query, $options: "i" } },
        { message: { $regex: query, $options: "i" } },
        { orderId: { $regex: query, $options: "i" } },
      ];
    }
  }

  const tickets = await TicketModel.find(filter)
    .populate("user", "name email")
    .sort({ updatedAt: -1 });

  response.json(tickets.map(formatAdminTicket));
});

export const adminGetTicketById = asyncHandler(async (request, response) => {
  const ticket = await TicketModel.findById(request.params.id).populate(
    "user",
    "name email",
  );

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  response.json(formatAdminTicket(ticket));
});

export const adminUpdateTicket = asyncHandler(async (request, response) => {
  const ticket = await TicketModel.findById(request.params.id).populate(
    "user",
    "name email",
  );

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  const { status, priority } = request.body;
  const changes = [];

  if (status != null) {
    if (!VALID_STATUSES.has(status)) {
      throw new ApiError(400, "Invalid ticket status");
    }

    if (ticket.status !== status) {
      changes.push(`status: ${ticket.status} → ${status}`);
      ticket.status = status;
    }
  }

  if (priority != null) {
    if (!VALID_PRIORITIES.has(priority)) {
      throw new ApiError(400, "Invalid ticket priority");
    }

    if (ticket.priority !== priority) {
      changes.push(`priority: ${ticket.priority} → ${priority}`);
      ticket.priority = priority;
    }
  }

  if (changes.length === 0) {
    throw new ApiError(400, "No valid ticket fields to update");
  }

  await ticket.save();

  await writeAuditLog({
    actor: request.user,
    action: "ticket.update",
    entityType: "ticket",
    entityId: ticket._id,
    summary: `Cập nhật ticket "${ticket.subject}" (${changes.join(", ")})`,
    metadata: { status: ticket.status, priority: ticket.priority },
  });

  response.json(formatAdminTicket(ticket));
});

export const adminReplyTicket = asyncHandler(async (request, response) => {
  const message = String(request.body.message || "").trim();

  if (!message) {
    throw new ApiError(400, "Reply message is required");
  }

  const ticket = await TicketModel.findById(request.params.id).populate(
    "user",
    "name email",
  );

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  ticket.replies.push({
    author: request.user._id,
    authorRole: "ADMIN",
    message,
  });

  if (ticket.status === "open") {
    ticket.status = "pending";
  }

  if (request.body.status && VALID_STATUSES.has(request.body.status)) {
    ticket.status = request.body.status;
  }

  await ticket.save();

  const userId = ticket.user?._id || ticket.user;

  await notifyTicketUser(userId, {
    type: "support",
    title: "Phản hồi hỗ trợ mới",
    message: `Shop đã trả lời ticket "${ticket.subject}".`,
    data: { ticketId: ticket._id },
  });

  await writeAuditLog({
    actor: request.user,
    action: "ticket.reply",
    entityType: "ticket",
    entityId: ticket._id,
    summary: `Trả lời ticket "${ticket.subject}"`,
    metadata: { status: ticket.status },
  });

  response.status(201).json(formatAdminTicket(ticket));
});
