// src/api.js
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function http(
  path,
  { method = "GET", body, headers = {}, auth = false, retry = true } = {}
) {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const resolvedHeaders = {
    ...(!isFormData && body ? { "Content-Type": "application/json" } : {}),
    ...(auth && getAccessToken()
      ? { Authorization: `Bearer ${getAccessToken()}` }
      : {}),
    ...headers,
  };

  const res = await fetch(BASE_URL + path, {
    method,
    headers: resolvedHeaders,
    body: body
      ? isFormData
        ? body
        : JSON.stringify(body)
      : undefined,
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

const toQueryString = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value === "") return;
    search.append(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

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

const toJsonArray = (value) => {
  if (!value) return "[]";
  if (Array.isArray(value)) {
    const arr = value.map((item) => `${item}`.trim()).filter(Boolean);
    return JSON.stringify(arr);
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify([]);
};

export const categoryApi = {
  async list(params = {}) {
    const qs = toQueryString(params);
    const data = await http(`/categories${qs}`, { auth: true });
    return data.categories || [];
  },
  async tree() {
    const data = await http("/categories/tree", { auth: true });
    return data.categories || [];
  },
  async get(idOrSlug) {
    const data = await http(`/categories/${idOrSlug}`, { auth: true });
    return data.category;
  },
  async create(payload) {
    const form = new FormData();
    form.append("name", payload.name.trim());
    if (payload.parent) form.append("parent", payload.parent);
    if (payload.image) form.append("image", payload.image);
    const data = await http("/categories", {
      method: "POST",
      body: form,
      auth: true,
    });
    return data.category;
  },
  async update(idOrSlug, payload) {
    const form = new FormData();
    if (payload.name !== undefined) form.append("name", payload.name.trim());
    if (payload.parent !== undefined)
      form.append("parent", payload.parent || "");
    if (payload.image) form.append("image", payload.image);
    if (payload.removeImage !== undefined)
      form.append("removeImage", payload.removeImage ? "true" : "false");
    const data = await http(`/categories/${idOrSlug}`, {
      method: "PATCH",
      body: form,
      auth: true,
    });
    return data.category;
  },
  async remove(idOrSlug) {
    return http(`/categories/${idOrSlug}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const productApi = {
  async list(params = {}) {
    const qs = toQueryString(params);
    const data = await http(`/products${qs}`, { auth: true });
    return data;
  },
  async get(idOrSlug) {
    const data = await http(`/products/${idOrSlug}`, { auth: true });
    return data.product;
  },
  async create(payload) {
    const form = new FormData();
    form.append("name", payload.name.trim());
    form.append("price", String(payload.price));
    if (payload.description)
      form.append("description", payload.description.trim());
    if (payload.careInstructions)
      form.append("careInstructions", payload.careInstructions.trim());
    if (payload.details)
      form.append("details", toJsonArray(payload.details));
    if (payload.colors)
      form.append("colors", toJsonArray(payload.colors));
    if (payload.sizes) form.append("sizes", toJsonArray(payload.sizes));
    if (payload.category) form.append("category", payload.category);
    if (payload.isActive !== undefined)
      form.append("isActive", payload.isActive ? "true" : "false");
    if (payload.showColors !== undefined)
      form.append("showColors", payload.showColors ? "true" : "false");
    if (payload.showSizes !== undefined)
      form.append("showSizes", payload.showSizes ? "true" : "false");
    if (payload.customAttribute)
      form.append("customAttribute", JSON.stringify(payload.customAttribute));
    if (payload.inventory)
      form.append("inventory", JSON.stringify(payload.inventory));
    (payload.images || []).forEach((file) => form.append("images", file));

    const data = await http("/products", {
      method: "POST",
      body: form,
      auth: true,
    });
    return data.product;
  },
  async update(idOrSlug, payload) {
    const form = new FormData();
    if (payload.name !== undefined) form.append("name", payload.name.trim());
    if (payload.price !== undefined)
      form.append("price", String(payload.price));
    if (payload.description !== undefined)
      form.append("description", payload.description.trim());
    if (payload.careInstructions !== undefined)
      form.append("careInstructions", payload.careInstructions.trim());
    if (payload.details !== undefined)
      form.append("details", toJsonArray(payload.details));
    if (payload.colors !== undefined)
      form.append("colors", toJsonArray(payload.colors));
    if (payload.sizes !== undefined)
      form.append("sizes", toJsonArray(payload.sizes));
    if (payload.category !== undefined)
      form.append("category", payload.category || "");
    if (payload.isActive !== undefined)
      form.append("isActive", payload.isActive ? "true" : "false");
    if (payload.showColors !== undefined)
      form.append("showColors", payload.showColors ? "true" : "false");
    if (payload.showSizes !== undefined)
      form.append("showSizes", payload.showSizes ? "true" : "false");
    if (payload.customAttribute !== undefined)
      form.append("customAttribute", JSON.stringify(payload.customAttribute));
    (payload.images || []).forEach((file) => form.append("images", file));
    if (payload.removeImagePublicIds?.length) {
      form.append(
        "removeImagePublicIds",
        toJsonArray(payload.removeImagePublicIds)
      );
    }
    if (payload.inventory !== undefined)
      form.append("inventory", JSON.stringify(payload.inventory));

    const data = await http(`/products/${idOrSlug}`, {
      method: "PUT",
      body: form,
      auth: true,
    });
    return data.product;
  },
  async remove(idOrSlug) {
    return http(`/products/${idOrSlug}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const mediaApi = {
  async usage() {
    const data = await http("/media/usage", { auth: true });
    return data.usage;
  },
  async list(params = {}) {
    const qs = toQueryString(params);
    const data = await http(`/media/resources${qs}`, { auth: true });
    return data;
  },
  async remove(publicId, params = {}) {
    const qs = toQueryString(params);
    return http(`/media/resources/${encodeURIComponent(publicId)}${qs}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export default {
  http,
  authApi,
  categoryApi,
  productApi,
  mediaApi,
  getAccessToken,
  setAccessToken,
  getUser,
  setUser,
  refreshAccessToken,
};
