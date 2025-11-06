import { http, toQueryString } from "./client.js";
import { DEFAULT_LANG } from "../constants/lang.js";

function extractIds(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => {
      if (!value) return null;
      if (typeof value === "string") return value.trim();
      if (typeof value === "object") {
        return (
          value.id ||
          value._id ||
          value.value ||
          (typeof value.toString === "function" ? value.toString() : null)
        );
      }
      return null;
    })
    .filter(Boolean);
}

function buildFormData(
  {
    name,
    description,
    badge,
    ctaText,
    layout,
    isActive,
    sortOrder,
    products,
    sets,
    categories,
    discounts,
    image,
  },
  { includeImage = true } = {}
) {
  const form = new FormData();

  if (name !== undefined) form.append("name", String(name).trim());
  if (description !== undefined)
    form.append("description", description == null ? "" : String(description));
  if (badge !== undefined)
    form.append("badge", badge == null ? "" : String(badge));
  if (ctaText !== undefined)
    form.append("ctaText", ctaText == null ? "" : String(ctaText));
  if (layout !== undefined) form.append("layout", String(layout).toUpperCase());
  if (isActive !== undefined)
    form.append(
      "isActive",
      typeof isActive === "boolean" ? (isActive ? "true" : "false") : String(isActive)
    );
  if (sortOrder !== undefined) form.append("sortOrder", String(sortOrder));

  const appendIds = (field, values) => {
    if (values === undefined) return;
    const ids = extractIds(
      Array.isArray(values) ? values : values ? [values] : []
    );
    form.append(field, JSON.stringify(ids));
  };

  appendIds("products", products);
  appendIds("sets", sets);
  appendIds("categories", categories);
  appendIds("discounts", discounts);

  if (includeImage && image instanceof File) {
    form.append("image", image);
  } else if (includeImage && image && image.originalFile instanceof File) {
    form.append("image", image.originalFile);
  }

  return form;
}

export const campaignApi = {
  async listHome(lang = DEFAULT_LANG) {
    const qs = toQueryString({ lang: lang ?? DEFAULT_LANG });
    const data = await http(`/campaigns${qs}`);
    return data.campaigns || [];
  },

  async listManage({ includeInactive = true } = {}, lang = DEFAULT_LANG) {
    const qs = toQueryString({
      includeInactive: includeInactive ? "true" : undefined,
      lang: lang ?? DEFAULT_LANG,
    });
    const data = await http(`/campaigns/manage${qs}`, { auth: true });
    return data.campaigns || [];
  },

  async get(id, lang = DEFAULT_LANG) {
    const qs = toQueryString({ lang: lang ?? DEFAULT_LANG });
    const data = await http(`/campaigns/${id}${qs}`, { auth: true });
    return data.campaign;
  },

  async create(payload, lang = DEFAULT_LANG) {
    const form = buildFormData(payload, { includeImage: true });
    const qs = toQueryString({ lang: lang ?? DEFAULT_LANG });
    const data = await http(`/campaigns${qs}`, {
      method: "POST",
      body: form,
      auth: true,
    });
    return data.campaign;
  },

  async update(id, payload, lang = DEFAULT_LANG) {
    const form = buildFormData(payload, { includeImage: payload.image !== undefined });
    const qs = toQueryString({ lang: lang ?? DEFAULT_LANG });
    const data = await http(`/campaigns/${id}${qs}`, {
      method: "PUT",
      body: form,
      auth: true,
    });
    return data.campaign;
  },

  async remove(id) {
    await http(`/campaigns/${id}`, { method: "DELETE", auth: true });
    return true;
  },

  async reorder(orders) {
    await http("/campaigns/reorder", {
      method: "POST",
      auth: true,
      body: { orders },
    });
    return true;
  },

  async resolve(id, lang = DEFAULT_LANG) {
    const qs = toQueryString({ lang: lang ?? DEFAULT_LANG });
    const data = await http(`/campaigns/${id}/resolve${qs}`);
    return data;
  },
};
