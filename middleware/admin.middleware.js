export function adminOnly(request, response, next) {
  if (!request.user) {
    return response.status(401).json({ message: "Not authorized" });
  }

  if (request.user.role !== "ADMIN") {
    return response.status(403).json({ message: "Admin access required" });
  }

  next();
}
