import jwt from "jsonwebtoken";

import UserModel from "../models/user.model.js";

export async function optionalAuth(request, response, next) {
  try {
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer")) {
      return next();
    }

    const token = header.split(" ")[1];

    if (!token || !process.env.JWT_SECRET) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.id);

    if (user && user.status === "Active") {
      request.user = user;
    }
  } catch {
    // ignore invalid token for optional auth
  }

  next();
}
