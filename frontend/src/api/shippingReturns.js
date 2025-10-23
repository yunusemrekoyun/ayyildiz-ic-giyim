// src/api/shippingReturns.js
import { http } from "./client";

export const shippingReturnsApi = {
  async get() {
    const data = await http("/shipping-returns");
    return (
      data?.page || {
        heroTitle: "",
        heroSubtitle: "",
        sections: [],
        sidebar: { quickFacts: [], helpBoxHtml: "" },
        seo: { title: "", description: "", keywords: [] },
        isActive: true,
      }
    );
  },

  async manage() {
    const data = await http("/shipping-returns/manage", { auth: true });
    return (
      data?.page || {
        heroTitle: "",
        heroSubtitle: "",
        sections: [],
        sidebar: { quickFacts: [], helpBoxHtml: "" },
        seo: { title: "", description: "", keywords: [] },
        isActive: true,
      }
    );
  },

  async upsert(payload) {
    const data = await http("/shipping-returns", {
      method: "PUT",
      body: payload,
      auth: true,
    });
    if (data?.page) return data.page;
    if (data?.success || data?.ok) {
      // hemen ardından yönetim endpoint'inden güncel içeriği çek
      const refreshed = await this.manage().catch(() => null);
      return refreshed || payload; // hiçbir şey dönmezse son payload’ı koru
    }
    // fallback
    return payload;
  },
};
