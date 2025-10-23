// src/api/faq.js
import { http } from "./client";

export const faqApi = {
  // 🔹 Admin: FAQ içeriğini yönetim panelinde görüntülemek için
  async manage() {
    const data = await http("/faq/manage", { auth: true });
    return (
      data?.faq || {
        heroTitle: "",
        heroIntro: "",
        sections: [],
        seo: { title: "", description: "", keywords: [] },
        isActive: true,
      }
    );
  },

  // 🔹 Admin: FAQ içeriğini kaydetmek/güncellemek için
  async upsert(payload) {
    const data = await http("/faq", {
      method: "PUT",
      body: payload,
      auth: true,
    });
    return data?.faq;
  },

  // 🔹 Public: Kullanıcıların sitede gördüğü dinamik FAQ verisini çekmek için
  async public() {
    const data = await http("/faq", { auth: false });
    return (
      data?.faq || {
        isActive: false,
        heroTitle: "Frequently Asked Questions",
        heroIntro: "",
        sections: [],
      }
    );
  },
};
