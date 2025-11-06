// src/api/about.js
import { http, toQueryString } from "./client.js";
import { DEFAULT_LANG } from "../constants/lang.js";

export const aboutApi = {
  async get(lang = DEFAULT_LANG) {
    const qs = toQueryString({ lang: lang ?? DEFAULT_LANG });
    return await http(`/about${qs}`);
  },
  async update(formData, lang = DEFAULT_LANG) {
    const qs = toQueryString({ lang: lang ?? DEFAULT_LANG });
    return await http(`/about${qs}`, {
      method: "PUT",
      body: formData,
      auth: true,
    });
  },
};
