// src/api.js
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function http(
  path,
  { method = "GET", body, headers = {}, auth = false, retry = true } = {}
) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth && getAccessToken()
        ? { Authorization: `Bearer ${getAccessToken()}` }
        : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // refresh cookie için
  });

  if (auth && res.status === 401 && retry) {
    const ok = await refreshAccessToken();
    if (ok) return http(path, { method, body, headers, auth, retry: false });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ---------- helpers ---------- */
const ACCESS_KEY = "accessToken";
const USER_KEY = "authUser";

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY) || null;
export const setAccessToken = (t) =>
  t ? localStorage.setItem(ACCESS_KEY, t) : localStorage.removeItem(ACCESS_KEY);

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};
export const setUser = (u) =>
  u
    ? localStorage.setItem(USER_KEY, JSON.stringify(u))
    : localStorage.removeItem(USER_KEY);

/* ---------- auth api ---------- */
export const authApi = {
  async register({
    firstName,
    lastName,
    email,
    phone,
    password,
    role = "user",
  }) {
    const data = await http("/auth/register", {
      method: "POST",
      body: { firstName, lastName, email, phone, password, role },
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  },
  async login({ email, password }) {
    const data = await http("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  },
  async me() {
    const data = await http("/auth/me", { auth: true });
    if (data?.user) setUser(data.user);
    return data?.user || null;
  },
  async logout() {
    try {
      await http("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setAccessToken(null);
    setUser(null);
  },
};

export async function refreshAccessToken() {
  try {
    const data = await http("/auth/refresh", { method: "POST" });
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export default {
  http,
  authApi,
  getAccessToken,
  setAccessToken,
  getUser,
  setUser,
  refreshAccessToken,
};
