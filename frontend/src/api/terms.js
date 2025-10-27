// src/api/terms.js
import { http, tenantHttp, resolveSiteCode } from "./client";

const withSite = (siteCode) => resolveSiteCode(siteCode);

async function fetchTenantTerms(siteCode, options = {}) {
  if (!siteCode) return null;
  try {
    const response = await tenantHttp(siteCode, "/pages/terms", {
      auth: options.auth ?? false,
    });
    return response?.page || null;
  } catch {
    return null;
  }
}

const EMPTY = {
  heroTitle: "Terms of Service",
  heroIntro: "",
  sections: [],
  footerNote: "",
  isActive: true,
  seo: { title: "", description: "", keywords: [] },
};

export const termsApi = {
  async public(options = {}) {
    const siteCode = withSite(options.siteCode);
    const tenantPage = await fetchTenantTerms(siteCode);
    if (tenantPage?.content) return tenantPage.content;
    const data = await http("/terms");
    // { terms: {...} } şeklinde geliyor
    return data?.terms || EMPTY;
  },
  async manage(options = {}) {
    const siteCode = withSite(options.siteCode);
    const tenantPage = await fetchTenantTerms(siteCode, { auth: true });
    if (tenantPage?.content) return tenantPage.content;
    const data = await http("/terms/manage", { auth: true });
    return data?.terms || EMPTY;
  },
  async upsert(payload, options = {}) {
    const siteCode = withSite(options.siteCode);

    try {
      const response = await tenantHttp(siteCode, "/pages/terms", {
        method: "PUT",
        body: {
          title: payload?.heroTitle || "Terms of Service",
          slug: "terms",
          content: payload,
          seo: payload?.seo || {},
        },
        auth: true,
      });
      return response?.page?.content || payload;
    } catch {
      /* fallback */
    }

    const data = await http("/terms", {
      method: "PUT",
      body: payload,
      auth: true,
    });
    return data?.terms || payload; // her zaman unwrap
  },
};
