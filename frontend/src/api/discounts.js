import { http } from "./client.js";

// Backend düz alanlar bekliyor: products, sets, categories (+resolve opsiyonel)
function normalizeDiscountPayload(payload = {}) {
  const {
    name,
    description = "",
    percentage,
    active = true,
    products = [],
    sets = [],
    categories = [],
    resolve,
  } = payload;

  // 🔧 ID dönüştürme (her elemanı string ObjectId haline getir)
  const toIdArray = (arr) =>
    (arr || [])
      .map((v) => {
        if (!v) return null;
        if (typeof v === "string") return v.trim();
        if (typeof v === "object") return v.id || v._id || null;
        return null;
      })
      .filter((v) => v && /^[a-f\d]{24}$/i.test(v)); // sadece 24 haneli ObjectId'leri tut

  const body = {
    name,
    description,
    percentage,
    active,
    products: toIdArray(products),
    sets: toIdArray(sets),
    categories: toIdArray(categories),
  };

  if (resolve != null) body.resolve = resolve;
  return body;
}

export const discountApi = {
  async list() {
    const data = await http("/discounts", { auth: true });
    return data.discounts || [];
  },

  async create(payload) {
    const data = await http("/discounts", {
      method: "POST",
      body: normalizeDiscountPayload(payload),
      auth: true,
    });
    return data.discount;
  },

  async update(id, payload) {
    const data = await http(`/discounts/${id}`, {
      method: "PATCH",
      body: normalizeDiscountPayload(payload),
      auth: true,
    });
    return data.discount;
  },

  async remove(id) {
    await http(`/discounts/${id}`, { method: "DELETE", auth: true });
    return true;
  },
};
