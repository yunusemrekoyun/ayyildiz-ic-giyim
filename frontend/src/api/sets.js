import { http, toQueryString } from "./client.js";

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
