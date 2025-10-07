import { http, toQueryString } from "./client.js";

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
