// src/api/faq.js
import { http, tenantHttp, resolveSiteCode } from "./client";

const withSite = (siteCode) => resolveSiteCode(siteCode);

async function fetchTenantFaq(siteCode, options = {}) {
  if (!siteCode) return null;
  try {
    const response = await tenantHttp(siteCode, "/pages/faq", {
      auth: options.auth ?? false,
    });
    return response?.page || null;
  } catch (error) {
    return null;
  }
}

const EMPTY = {
  isActive: false,
  heroTitle: "Frequently Asked Questions",
  heroIntro: "",
  sections: [],
  seo: { title: "", description: "", keywords: [] },
};

export const faqApi = {
  // 🔹 Admin: FAQ içeriğini yönetim panelinde görüntülemek için
  async manage(options = {}) {
    const siteCode = withSite(options.siteCode);
    const tenantPage = await fetchTenantFaq(siteCode, { auth: true });
    if (tenantPage?.content) {
      return tenantPage.content;
    }
    const data = await http("/faq/manage", { auth: true });
    return data?.faq || EMPTY;
  },

  // 🔹 Admin: FAQ içeriğini kaydetmek/güncellemek için
  async upsert(payload, options = {}) {
    const siteCode = withSite(options.siteCode);

    // tenant sayfası üzerinden saklamayı dene (content olarak)
    try {
      const response = await tenantHttp(siteCode, "/pages/faq", {
        method: "PUT",
        body: {
          title: payload?.heroTitle || "FAQ",
          slug: "faq",
          content: payload,
          seo: payload?.seo || {},
        },
        auth: true,
      });
      return response?.page?.content || payload;
    } catch (error) {
      // fallback legacy endpoint
    }

    const data = await http("/faq", {
      method: "PUT",
      body: payload,
      auth: true,
    });
    return data?.faq || payload;
  },

  // 🔹 Public: Kullanıcıların sitede gördüğü dinamik FAQ verisini çekmek için
  async public(options = {}) {
    const siteCode = withSite(options.siteCode);
    const tenantPage = await fetchTenantFaq(siteCode);
    if (tenantPage?.content) {
      return tenantPage.content;
    }
    const data = await http("/faq", { auth: false });
    return data?.faq || EMPTY;
  },
};
