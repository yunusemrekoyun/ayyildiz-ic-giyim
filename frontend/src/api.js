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
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    credentials: "include", // refresh cookie için
  });

  // Access token süresi bitmişse refresh dene
  if (auth && res.status === 401 && retry) {
    const ok = await refreshAccessToken();
    if (ok) return http(path, { method, body, headers, auth, retry: false });
  }

  // Me endpoint'inde 403 ⇒ hesap pasif/silinmiş ⇒ local state temizle
  if (auth && res.status === 403 && path.startsWith("/auth/me")) {
    setAccessToken(null);
    setUser(null);
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
    if (payload.details) form.append("details", toJsonArray(payload.details));
    if (payload.colors) form.append("colors", toJsonArray(payload.colors));
    if (payload.sizes) form.append("sizes", toJsonArray(payload.sizes));
    if (payload.category) form.append("category", payload.category);
    if (payload.isActive !== undefined)
      form.append("isActive", payload.isActive ? "true" : "false");
    if (payload.showColors !== undefined)
      form.append("showColors", payload.showColors ? "true" : "false");
    if (payload.showSizes !== undefined)
      form.append("showSizes", payload.showSizes ? "true" : "false");
    if (payload.listedInCatalog !== undefined)
      form.append(
        "listedInCatalog",
        payload.listedInCatalog ? "true" : "false"
      );
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
    if (payload.listedInCatalog !== undefined)
      form.append(
        "listedInCatalog",
        payload.listedInCatalog ? "true" : "false"
      );
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

export const userApi = {
  async list(params = {}) {
    // params: { page, limit, sort, role, search, status }
    const qs = toQueryString(params);
    return http(`/users${qs}`, { auth: true });
  },
  async get(idOrKey) {
    const data = await http(`/users/${encodeURIComponent(idOrKey)}`, {
      auth: true,
    });
    return data.user;
  },
  async update(idOrKey, payload) {
    const data = await http(`/users/${encodeURIComponent(idOrKey)}`, {
      method: "PATCH",
      body: payload,
      auth: true,
    });
    return data.user;
  },
  async softDelete(idOrKey) {
    const data = await http(
      `/users/${encodeURIComponent(idOrKey)}/soft-delete`,
      { method: "POST", auth: true }
    );
    return data.user;
  },
  async restore(idOrKey) {
    const data = await http(`/users/${encodeURIComponent(idOrKey)}/restore`, {
      method: "POST",
      auth: true,
    });
    return data.user;
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
/* ---------- hero api ---------- */
export const heroApi = {
  async list({ includeInactive = false } = {}) {
    const qs = includeInactive ? `?includeInactive=true` : "";
    const data = await http(`/heroes${qs}`, { auth: true });
    // backend: { heroes: [...] }
    return data.heroes || [];
  },

  async create({
    title,
    subtitle,
    buttonText = "",
    targetType = "SHOP",
    categories = [],
    isActive = true,
    sortOrder = 0,
    file,
  }) {
    const form = new FormData();
    form.append("title", String(title).trim());
    form.append("subtitle", String(subtitle).trim());
    if (buttonText !== undefined) form.append("buttonText", String(buttonText));
    form.append("targetType", String(targetType).toUpperCase());
    form.append("isActive", isActive ? "true" : "false");
    form.append("sortOrder", String(Number(sortOrder) || 0));
    if (Array.isArray(categories) && categories.length) {
      // controller hem dizi hem CSV'yi destekliyor; CSV güvenli
      form.append("categories", categories.join(","));
    }
    if (file) form.append("media", file);

    const data = await http(`/heroes`, {
      method: "POST",
      body: form,
      auth: true,
    });
    return data.hero;
  },

  async update(
    id,
    {
      title,
      subtitle,
      buttonText,
      targetType,
      categories,
      isActive,
      sortOrder,
      file,
      removeMedia,
    }
  ) {
    const form = new FormData();
    if (title !== undefined) form.append("title", String(title));
    if (subtitle !== undefined) form.append("subtitle", String(subtitle));
    if (buttonText !== undefined) form.append("buttonText", String(buttonText));
    if (targetType !== undefined)
      form.append("targetType", String(targetType).toUpperCase());
    if (Array.isArray(categories))
      form.append("categories", categories.join(","));
    if (isActive !== undefined)
      form.append("isActive", isActive ? "true" : "false");
    if (sortOrder !== undefined)
      form.append("sortOrder", String(Number(sortOrder) || 0));
    if (file) form.append("media", file);
    if (removeMedia) form.append("removeMedia", "true");

    const data = await http(`/heroes/${id}`, {
      method: "PUT",
      body: form,
      auth: true,
    });
    return data.hero;
  },

  async remove(id) {
    await http(`/heroes/${id}`, { method: "DELETE", auth: true });
    return true;
  },

  async reorder(orders) {
    // orders: [{ id, sortOrder }]
    await http(`/heroes/reorder`, {
      method: "POST",
      auth: true,
      body: { orders },
      headers: { "Content-Type": "application/json" },
    });
    return true;
  },
};
export const setApi = {
  async list(params = {}) {
    const qs = toQueryString(params);
    const data = await http(`/sets${qs}`);
    return data.sets || [];
  },
  async get(idOrSlug) {
    const data = await http(`/sets/${idOrSlug}`, { auth: true });
    return data.set;
  },
  async create(payload) {
    const form = buildSetFormData(payload);
    const data = await http("/sets", {
      method: "POST",
      body: form,
      auth: true,
    });
    return data;
  },
  async update(idOrSlug, payload) {
    const form = buildSetFormData(payload);
    const data = await http(`/sets/${idOrSlug}`, {
      method: "PUT",
      body: form,
      auth: true,
    });
    return data;
  },
  async remove(idOrSlug) {
    return http(`/sets/${idOrSlug}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const orderApi = {
  async create({ addressId, items }) {
    const data = await http("/orders", {
      method: "POST",
      auth: true,
      body: { addressId, items },
    });
    return data.order;
  },
  async mine() {
    const data = await http("/orders/mine", { auth: true });
    return data.orders || [];
  },
  async get(id) {
    const data = await http(`/orders/${id}`, { auth: true });
    return data.order || null;
  },
};

// ---------- user details api ----------
export const userDetailsApi = {
  /** Tüm detaylar (profile + addresses + favorites id'leri) */
  async getAll() {
    const data = await http("/user-details/me", { auth: true });
    return data?.details || data || null;
  },

  /** Eski kullanım ile uyumlu kısa yol */
  async me() {
    return this.getAll();
  },

  /** Profil/demografik güncelleme (firstName, lastName, email, phone, gender, birthDate) */
  async updateProfile({
    firstName,
    lastName,
    email,
    phone,
    gender,
    birthDate,
  }) {
    const payload = {};
    if (firstName !== undefined) payload.firstName = String(firstName).trim();
    if (lastName !== undefined) payload.lastName = String(lastName).trim();
    if (email !== undefined) payload.email = String(email).trim();
    if (phone !== undefined) payload.phone = String(phone).trim();
    if (gender !== undefined) payload.gender = String(gender).trim();
    if (birthDate !== undefined) payload.birthDate = birthDate;

    const data = await http("/user-details/me", {
      method: "PUT",
      body: payload,
      auth: true,
    });

    return data?.details || data || null;
  },

  /** Avatar güncelle (tek dosya) */
  async uploadAvatar(file) {
    const form = new FormData();
    form.append("avatar", file);
    const data = await http("/user-details/me/avatar", {
      method: "PATCH",
      body: form,
      auth: true,
    });
    // data => { avatar }
    return data?.avatar || null;
  },

  /** Adres listesi — ayrı GET yok; me() içinden alınır */
  async listAddresses() {
    const details = await this.getAll();
    return details?.addresses || [];
  },

  /** Adres ekle */
  async createAddress(payload) {
    // payload: { label, fullName, phone, country, city, district, postalCode, addressLine, isDefault }
    const data = await http("/user-details/addresses", {
      method: "POST",
      body: payload,
      auth: true,
    });
    return data?.address || null;
  },

  /** Adres güncelle (backend PUT kullanıyor) */
  async updateAddress(addressId, payload) {
    const data = await http(`/user-details/addresses/${addressId}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
    return data?.address || null;
  },

  /** Adres sil */
  async deleteAddress(addressId) {
    await http(`/user-details/addresses/${addressId}`, {
      method: "DELETE",
      auth: true,
    });
    return true;
  },

  /** Favoriler (populate) */
  async favorites() {
    const data = await http("/user-details/favorites", { auth: true });
    // { favorites: { products: [...], sets: [...] } }
    return data?.favorites || { products: [], sets: [] };
  },

  /** Favori toggle */
  async toggleFavorite({ type, id }) {
    const data = await http("/user-details/favorites/toggle", {
      method: "POST",
      auth: true,
      body: { type, id },
    });
    // { ok, favorites: { productCount, setCount } }
    return data;
  },
};

export default {
  http,
  authApi,
  categoryApi,
  productApi,
  userApi,
  mediaApi,
  orderApi,
  heroApi,
  setApi,
  userDetailsApi,
  getAccessToken,
  setAccessToken,
  getUser,
  setUser,
  refreshAccessToken,
};

function buildSetFormData(payload = {}) {
  const form = new FormData();
  if (payload.name !== undefined) form.append("name", payload.name.trim());
  if (payload.description !== undefined)
    form.append("description", payload.description.trim());
  if (payload.price !== undefined) form.append("price", String(payload.price));
  if (payload.show !== undefined)
    form.append("show", payload.show ? "true" : "false");

  if (payload.products) {
    form.append("products", JSON.stringify(payload.products));
  }

  (payload.images || []).forEach((file) => form.append("images", file));

  if (payload.removeImagePublicIds?.length) {
    form.append(
      "removeImagePublicIds",
      JSON.stringify(payload.removeImagePublicIds)
    );
  }

  return form;
}
