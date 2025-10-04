// backend/controllers/userController.js
import mongoose from "mongoose";
import User from "../models/User.js";
import { buildUserFilter, shapeUser } from "../utils/userPresenter.js";

const SORT_MAP = {
  recent: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { firstName: 1, lastName: 1 },
  role: { role: 1, createdAt: -1 },
};

const MIN_LIMIT = 5;
const MAX_LIMIT = 100;

export async function listUsers(req, res) {
  try {
    const { page = 1, limit = 20, search = "", role = "", sort = "recent" } =
      req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(
      MAX_LIMIT,
      Math.max(MIN_LIMIT, Number(limit) || MIN_LIMIT)
    );

    const filter = buildUserFilter({ search, role });
    const sortOption = SORT_MAP[sort] || SORT_MAP.recent;

    const [users, total, metrics] = await Promise.all([
      User.find(filter)
        .sort(sortOption)
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
      collectUserMetrics(),
    ]);

    res.json({
      users: users.map(shapeUser),
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      },
      metrics,
      appliedFilters: {
        search,
        role,
        sort,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to list users" });
  }
}

export async function getUser(req, res) {
  try {
    const { idOrKey } = req.params;
    const isId = mongoose.Types.ObjectId.isValid(idOrKey);

    const user = isId
      ? await User.findById(idOrKey)
      : await User.findOne({ email: idOrKey });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: shapeUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to fetch user" });
  }
}

export async function updateUser(req, res) {
  try {
    const { idOrKey } = req.params;
    const isId = mongoose.Types.ObjectId.isValid(idOrKey);

    const user = isId
      ? await User.findById(idOrKey)
      : await User.findOne({ email: idOrKey });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { firstName, lastName, phone, role } = req.body;

    if (firstName !== undefined) {
      const value = String(firstName).trim();
      if (!value) {
        return res.status(400).json({ message: "First name cannot be empty" });
      }
      user.firstName = value;
    }

    if (lastName !== undefined) {
      const value = String(lastName).trim();
      if (!value) {
        return res.status(400).json({ message: "Last name cannot be empty" });
      }
      user.lastName = value;
    }

    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }

    if (role !== undefined) {
      const normalized = String(role).toLowerCase();
      if (!["user", "admin"].includes(normalized)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      if (user.role !== normalized) {
        if (user.role === "admin" && normalized !== "admin") {
          const otherAdmins = await User.countDocuments({
            role: "admin",
            _id: { $ne: user._id },
          });
          if (otherAdmins === 0) {
            return res
              .status(400)
              .json({ message: "At least one admin must remain" });
          }
        }
        user.role = normalized;
      }
    }

    await user.save();

    res.json({ user: shapeUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to update user" });
  }
}

async function collectUserMetrics() {
  const now = new Date();
  const currentWindowStart = new Date(now);
  currentWindowStart.setHours(0, 0, 0, 0);
  currentWindowStart.setDate(currentWindowStart.getDate() - 30);

  const previousWindowStart = new Date(currentWindowStart);
  previousWindowStart.setDate(previousWindowStart.getDate() - 30);

  const [
    totalUsers,
    adminUsers,
    newUsersLast30Days,
    previousWindowUsers,
    latestUser,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({ createdAt: { $gte: currentWindowStart } }),
    User.countDocuments({
      createdAt: { $gte: previousWindowStart, $lt: currentWindowStart },
    }),
    User.findOne().sort({ createdAt: -1 }).lean(),
  ]);

  const growth = calculateGrowth(newUsersLast30Days, previousWindowUsers);

  return {
    totalUsers,
    adminUsers,
    newUsersLast30Days,
    growthRate30Days: growth,
    latestUser: latestUser ? shapeUser(latestUser) : null,
  };
}

function calculateGrowth(current, previous) {
  if (!previous && current) return 100;
  if (!previous) return 0;
  const delta = ((current - previous) / previous) * 100;
  return Number(delta.toFixed(1));
}
