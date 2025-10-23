// src/api/privacy.js
import { http } from "./client";

const EMPTY = {
  heroTitle: "",
  heroIntro: "",
  sections: [],
  footerHtml: "",
  seo: { title: "", description: "", keywords: [] },
  isActive: true,
};

export const privacyApi = {
  async public() {
    const data = await http("/privacy");
    return data?.privacy || EMPTY;
  },

  async manage() {
    const data = await http("/privacy/manage", { auth: true });
    return data?.privacy || EMPTY;
  },

  async upsert(payload) {
    const data = await http("/privacy", {
      method: "PUT",
      body: payload,
      auth: true,
    });
    if (data?.privacy) return data.privacy;
    // backend bir şey döndürmediyse güncel halini al
    try {
      const fallback = await this.manage();
      return fallback;
    } catch {
      return null;
    }
  },
};

export default privacyApi;
