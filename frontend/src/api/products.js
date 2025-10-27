import { tenantHttp, toQueryString, resolveSiteCode } from "./client.js";

const withSite = (siteCode) => resolveSiteCode(siteCode);

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
  async list(params = {}, options = {}) {
    const { siteCode: siteOverride, ...query } = params;
    const siteCode = withSite(siteOverride || options.siteCode);
    const qs = toQueryString(query);
    const data = await tenantHttp(siteCode, `/products${qs}`, {
      auth: options.auth ?? false,
    });
    return data;
  },
  async get(idOrSlug, options = {}) {
    const siteCode = withSite(options.siteCode);
    const data = await tenantHttp(siteCode, `/products/${idOrSlug}`, {
      auth: options.auth ?? false,
    });
    return data.product;
  },
  // TODO: Split admin base vs locale management in upcoming steps
  async create(payload, options = {}) {
    const siteCode = withSite(options.siteCode);
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
    if (payload.inventory !== undefined) {
      form.append("inventory", JSON.stringify(payload.inventory || []));
    }
    (payload.images || []).forEach((file) => form.append("images", file));

    const data = await tenantHttp(siteCode, "/products", {
      method: "POST",
      body: form,
      auth: options.auth ?? true,
    });
    return data.product;
  },
  async update(idOrSlug, payload, options = {}) {
    const siteCode = withSite(options.siteCode);
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
    if (payload.removeImagePublicIds?.length)
      form.append(
        "removeImagePublicIds",
        toJsonArray(payload.removeImagePublicIds)
      );
    // ✅ STOK BOŞ GİTMESİN
    if (payload.inventory !== undefined) {
      form.append("inventory", JSON.stringify(payload.inventory || []));
    }

    const data = await tenantHttp(siteCode, `/products/${idOrSlug}`, {
      method: "PUT",
      body: form,
      auth: options.auth ?? true,
    });
    return data.product;
  },
  async remove(idOrSlug, options = {}) {
    const siteCode = withSite(options.siteCode);
    return tenantHttp(siteCode, `/products/${idOrSlug}`, {
      method: "DELETE",
      auth: options.auth ?? true,
    });
  },
};
