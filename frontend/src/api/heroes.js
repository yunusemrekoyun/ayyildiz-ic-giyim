import { http } from "./client.js";

export const heroApi = {
  async list({ includeInactive = false, siteCode: _site } = {}) {
    const qs = includeInactive ? `?includeInactive=true` : "";
    const data = await http(`/heroes${qs}`, { auth: includeInactive });
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
    await http(`/heroes/reorder`, {
      method: "POST",
      auth: true,
      body: { orders },
      headers: { "Content-Type": "application/json" },
    });
    return true;
  },
};
