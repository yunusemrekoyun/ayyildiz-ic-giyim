// src/api/shippingReturns.js
import { http, tenantHttp, resolveSiteCode } from "./client";

const withSite = (siteCode) => resolveSiteCode(siteCode);

const EMPTY = {
  heroTitle: "",
  heroSubtitle: "",
  sections: [],
  sidebar: { quickFacts: [], helpBoxHtml: "" },
  seo: { title: "", description: "", keywords: [] },
  isActive: true,
};

async function fetchTenantShipping(siteCode, options = {}) {
  if (!siteCode) return null;
  try {
    const response = await tenantHttp(siteCode, "/pages/shipping-returns", {
      auth: options.auth ?? false,
    });
    return response?.page || null;
  } catch {
    return null;
  }
}

export const shippingReturnsApi = {
  async get(options = {}) {
    const siteCode = withSite(options.siteCode);
    const tenantPage = await fetchTenantShipping(siteCode);
    if (tenantPage?.content) return tenantPage.content;
    const data = await http(`/shipping-returns?_=${Date.now()}`);
    return data?.page || EMPTY;
  },

  async manage(options = {}) {
    const siteCode = withSite(options.siteCode);
    const tenantPage = await fetchTenantShipping(siteCode, { auth: true });
    if (tenantPage?.content) return tenantPage.content;
    const data = await http("/shipping-returns/manage", { auth: true });
    return data?.page || EMPTY;
  },

  async upsert(payload, options = {}) {
    const siteCode = withSite(options.siteCode);

    try {
      const response = await tenantHttp(siteCode, "/pages/shipping-returns", {
        method: "PUT",
        body: {
          title: payload?.heroTitle || "Shipping & Returns",
          slug: "shipping-returns",
          content: payload,
          seo: payload?.seo || {},
        },
        auth: true,
      });
      return response?.page?.content || payload;
    } catch {
      /* fallback */
    }

    const data = await http("/shipping-returns", {
      method: "PUT",
      body: payload,
      auth: true,
    });
    if (data?.page) return data.page;
    if (data?.success || data?.ok) {
      // hemen ardından yönetim endpoint'inden güncel içeriği çek
      const refreshed = await this.manage({ siteCode }).catch(() => null);
      return refreshed || payload; // hiçbir şey dönmezse son payload’ı koru
    }
    // fallback
    return payload;
  },
};
