import jwt from "jsonwebtoken";

import UserModel from "../models/user.model.js";

export async function protect(request, response, next) {
  try {
    let token;

    if (
      request.headers.authorization &&
      request.headers.authorization.startsWith("Bearer")
    ) {
      token = request.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return response.status(401).json({ message: "Not authorized" });
    }

    if (!process.env.JWT_SECRET) {
      return response.status(500).json({ message: "JWT is not configured" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      return response.status(401).json({ message: "User not found" });
    }

    if (user.status !== "Active") {
      return response.status(403).json({ message: "Account is not active" });
    }

    request.user = user;
    next();
  } catch {
    return response.status(401).json({ message: "Not authorized" });
  }
}
