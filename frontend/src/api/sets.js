// frontend/src/api/sets.js
import { http, toQueryString, resolveSiteCode } from "./client.js";

const withSite = (siteCode) => resolveSiteCode(siteCode);

function buildSetFormData(payload = {}) {
  const form = new FormData();
  if (payload.name !== undefined) form.append("name", payload.name.trim());
  if (payload.description !== undefined)
    form.append("description", payload.description.trim());
  if (payload.price !== undefined) form.append("price", String(payload.price));
  if (payload.show !== undefined)
    form.append("show", payload.show ? "true" : "false");

  if (payload.products) {
    // sadece { productId, quantity } listesi
    form.append("products", JSON.stringify(payload.products));
  }

  // Set'in kendi görselleri
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
  async list(params = {}, options = {}) {
    const { siteCode: siteOverride, ...query } = params;
    const siteCode = withSite(siteOverride || options.siteCode);
    const qs = toQueryString({ ...query, siteCode });
    const data = await http(`/sets${qs}`);
    return data.sets || [];
  },
  async get(idOrSlug, options = {}) {
    const siteCode = withSite(options.siteCode);
    const qs = toQueryString({ siteCode });
    const data = await http(`/sets/${idOrSlug}${qs}`, { auth: options.auth ?? false });
    return data.set;
  },
  async create(payload, options = {}) {
    const form = buildSetFormData(payload);
    const siteCode = withSite(options.siteCode);
    const qs = toQueryString({ siteCode });
    return http(`/sets${qs}`, { method: "POST", body: form, auth: true });
  },
  async update(idOrSlug, payload, options = {}) {
    const form = buildSetFormData(payload);
    const siteCode = withSite(options.siteCode);
    const qs = toQueryString({ siteCode });
    return http(`/sets/${idOrSlug}${qs}`, { method: "PUT", body: form, auth: true });
  },
  async remove(idOrSlug, options = {}) {
    const siteCode = withSite(options.siteCode);
    const qs = toQueryString({ siteCode });
    return http(`/sets/${idOrSlug}${qs}`, { method: "DELETE", auth: true });
  },
};
