// backend/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "7d";

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function setRefreshCookie(res, token) {
  // Prod'da secure: true ve sameSite:"none" (https) önerilir.
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth/refresh",
    maxAge: 1000 * 60 * 60 * 24 * 30, // tarayıcı süresi (server tarafı JWT already has exp)
  });
}

function userSafe(u) {
  return {
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt,
  };
}

/** POST /api/auth/register */
export const register = async (req, res) => {
  const { firstName, lastName, email, phone, password, role } = req.body;
  if (!firstName || !lastName || !email || !password)
    return res.status(400).json({ message: "Missing required fields" });

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    passwordHash,
    role: role && ["user", "admin"].includes(role) ? role : "user",
  });

  const accessToken = signAccessToken({ sub: user._id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user._id, role: user.role });

  // DB'ye refresh token'ı kaydet (rotate için)
  user.refreshToken = refreshToken;
  await user.save();

  setRefreshCookie(res, refreshToken);
  res
    .status(201)
    .json({ user: userSafe(user), accessToken, expiresIn: ACCESS_EXPIRES });
};

/** POST /api/auth/login */
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Missing credentials" });

  const user = await User.findOne({ email });
  if (!user)
    return res.status(401).json({ message: "Invalid email or password" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok)
    return res.status(401).json({ message: "Invalid email or password" });

  const accessToken = signAccessToken({ sub: user._id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user._id, role: user.role });

  user.refreshToken = refreshToken; // rotate
  await user.save();

  setRefreshCookie(res, refreshToken);
  res.json({ user: userSafe(user), accessToken, expiresIn: ACCESS_EXPIRES });
};

/** POST /api/auth/refresh */
export const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || user.refreshToken !== token)
      return res.status(401).json({ message: "Invalid refresh token" });

    // yeni tokenlar
    const newAccess = signAccessToken({ sub: user._id, role: user.role });
    const newRefresh = signRefreshToken({ sub: user._id, role: user.role });

    user.refreshToken = newRefresh; // rotate
    await user.save();

    setRefreshCookie(res, newRefresh);
    res.json({ accessToken: newAccess, expiresIn: ACCESS_EXPIRES });
  } catch (e) {
    return res.status(401).json({ message: "Refresh failed" });
  }
};

/** POST /api/auth/logout */
export const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = jwt.verify(token, REFRESH_SECRET);
      const user = await User.findById(payload.sub);
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    } catch {}
  }
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
  res.json({ ok: true });
};

/** GET /api/auth/me (Access Token gerekli) */
export const me = async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user: userSafe(user) });
};
