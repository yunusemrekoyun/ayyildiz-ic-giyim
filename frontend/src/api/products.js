import { http, toQueryString } from "./client.js";

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

export const productApi = {
  async list(params = {}) {
    const qs = toQueryString(params);
    const data = await http(`/products${qs}`, { auth: true });
    return data; // { products, pagination, ... }
  },

  async get(idOrSlug) {
    const data = await http(`/products/${idOrSlug}`, { auth: true });
    return data.product;
  },

  // payload = productPayload (stok HARİÇ!)
  async create(payload) {
    const form = new FormData();
    if (payload.name !== undefined) form.append("name", payload.name.trim());
    if (payload.price !== undefined)
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

    // 🚫 Artık INVENTORY GÖNDERMEYİZ (stoklar ayrı endpoint ile yazılıyor)
    (payload.images || []).forEach((file) => form.append("images", file));

    const data = await http("/products", {
      method: "POST",
      body: form,
      auth: true,
    });
    return data.product;
  },

  // payload = productPayload (stok HARİÇ!)
  async update(idOrSlug, payload) {
    const form = new FormData();
    if (payload.name !== undefined) form.append("name", payload.name.trim());
    if (payload.price !== undefined)
      form.append("price", String(payload.price));
    if (payload.description !== undefined)
      form.append("description", (payload.description || "").trim());
    if (payload.careInstructions !== undefined)
      form.append("careInstructions", (payload.careInstructions || "").trim());
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
    if (payload.removeImagePublicIds?.length)
      form.append(
        "removeImagePublicIds",
        toJsonArray(payload.removeImagePublicIds)
      );

    // 🚫 INVENTORY YOK

    const data = await http(`/products/${idOrSlug}`, {
      method: "PUT",
      body: form,
      auth: true,
    });
    return data.product;
  },

  async remove(idOrSlug, params = {}) {
    const qs = toQueryString(params);
    return http(`/products/${idOrSlug}${qs}`, {
      method: "DELETE",
      auth: true,
    });
  },

  async sets(idOrSlug) {
    const data = await http(`/products/${idOrSlug}/sets`, { auth: true });
    return data?.sets || [];
  },
};
