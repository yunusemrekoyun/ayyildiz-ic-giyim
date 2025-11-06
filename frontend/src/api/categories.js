import { http, toQueryString } from "./client.js";
import { DEFAULT_LANG } from "../constants/lang.js";

export const categoryApi = {
  async list(params = {}, lang = DEFAULT_LANG) {
    const qs = toQueryString({ ...params, lang: lang ?? DEFAULT_LANG });
    const data = await http(`/categories${qs}`, { auth: true });
    return data.categories || [];
  },

  async tree(lang = DEFAULT_LANG) {
    const qs = toQueryString({ lang: lang ?? DEFAULT_LANG });
    const data = await http(`/categories/tree${qs}`, { auth: true });
    return data.categories || [];
  },

  async get(idOrSlug, lang = DEFAULT_LANG) {
    const qs = toQueryString({ lang: lang ?? DEFAULT_LANG });
    const data = await http(`/categories/${idOrSlug}${qs}`, { auth: true });
    return data.category;
  },

  async create(payload, lang = DEFAULT_LANG) {
    const form = new FormData();
    form.append("name", payload.name.trim());
    if (payload.parent) form.append("parent", payload.parent);
    if (payload.image) form.append("image", payload.image);

    const qs = toQueryString({ lang: lang ?? DEFAULT_LANG });
    const data = await http(`/categories${qs}`, {
      method: "POST",
      body: form,
      auth: true,
    });
    return data.category;
  },

  async update(idOrSlug, payload, lang = DEFAULT_LANG) {
    const form = new FormData();
    if (payload.name !== undefined) form.append("name", payload.name.trim());
    if (payload.parent !== undefined)
      form.append("parent", payload.parent || "");
    if (payload.image) form.append("image", payload.image);
    if (payload.removeImage !== undefined)
      form.append("removeImage", payload.removeImage ? "true" : "false");

    const qs = toQueryString({ lang: lang ?? DEFAULT_LANG });
    const data = await http(`/categories/${idOrSlug}${qs}`, {
      method: "PATCH",
      body: form,
      auth: true,
    });
    return data.category;
  },

  async remove(idOrSlug) {
    // 🔍 DEBUG: gerçekten ne geliyor görelim
    console.log(
      "categoryApi.remove called with:",
      idOrSlug,
      "type=",
      typeof idOrSlug
    );

    // Eğer yanlışlıkla obje geldiyse, içinden id/_id almaya çalış
    let safeId = idOrSlug;

    if (idOrSlug && typeof idOrSlug === "object") {
      if (idOrSlug.id) safeId = idOrSlug.id;
      else if (idOrSlug._id) safeId = idOrSlug._id;
      else safeId = String(idOrSlug);
    }

    safeId = String(safeId);

    console.log("categoryApi.remove using safeId:", safeId);

    return http(`/categories/${safeId}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
