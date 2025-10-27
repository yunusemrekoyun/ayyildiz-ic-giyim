// backend/middleware/roles.js
export function requireRole(...roles) {
  return (req, res, next) => {
    const userRoles = Array.isArray(req.userRoles) ? req.userRoles : [];
    const hasRole = userRoles.some((role) => roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
