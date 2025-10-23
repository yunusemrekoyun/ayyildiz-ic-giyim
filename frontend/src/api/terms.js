// src/api/terms.js
import { http } from "./client";

export const termsApi = {
  async public() {
    const data = await http("/terms");
    // { terms: {...} } şeklinde geliyor
    return data?.terms || null;
  },
  async manage() {
    const data = await http("/terms/manage", { auth: true });
    return (
      data?.terms || {
        heroTitle: "Terms of Service",
        heroIntro: "",
        sections: [],
        footerNote: "", // ← ÖNEMLİ
        isActive: true,
        seo: { title: "", description: "", keywords: [] },
      }
    );
  },
  async upsert(payload) {
    const data = await http("/terms", {
      method: "PUT",
      body: payload,
      auth: true,
    });
    return data?.terms || null; // her zaman unwrap
  },
};
