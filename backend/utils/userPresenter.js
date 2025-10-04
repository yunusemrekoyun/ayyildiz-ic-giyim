// backend/utils/userPresenter.js
export function shapeUser(user) {
  if (!user) return null;

  const id = user._id || user.id || user;
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  const initialsSource = fullName || user.email || "?";
  const initials = initialsSource
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id: id?.toString ? id.toString() : String(id),
    firstName,
    lastName,
    fullName,
    email: user.email || "",
    phone: user.phone || "",
    role: user.role || "user",
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
    initials: initials || "?",
  };
}

export function buildUserFilter({ search, role }) {
  const filter = {};

  if (role && ["user", "admin"].includes(role)) {
    filter.role = role;
  }

  if (search && typeof search === "string" && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
    ];
  }

  return filter;
}
