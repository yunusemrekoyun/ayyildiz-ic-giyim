// backend/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

function buildRequireAuth({ requireAdmin = false } = {}) {
  return async function requireAuthMiddleware(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "No token" });

    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      const user = await User.findById(payload.sub).select(
        "roles allowedSites isDeleted deletedAlias"
      );

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (user.isDeleted) {
        return res.status(403).json({
          message: user.deletedAlias
            ? `Account is deactivated (${user.deletedAlias})`
            : "Account is deactivated",
        });
      }

      if (requireAdmin && !user.hasRole?.("admin")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      req.userId = user._id.toString();
      req.user = user;
      req.userRoles = Array.isArray(user.roles) ? user.roles : [];
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}

export const requireAuth = buildRequireAuth();
export const requireAdmin = buildRequireAuth({ requireAdmin: true });

export function enforceAllowedSites(req, res, next) {
  next();
}
