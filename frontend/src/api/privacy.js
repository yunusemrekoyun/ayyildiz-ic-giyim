// src/api/privacy.js
import { http, tenantHttp, resolveSiteCode } from "./client";

const EMPTY = {
  heroTitle: "",
  heroIntro: "",
  sections: [],
  footerHtml: "",
  seo: { title: "", description: "", keywords: [] },
  isActive: true,
};

const withSite = (siteCode) => resolveSiteCode(siteCode);

async function fetchTenantPrivacy(siteCode, options = {}) {
  if (!siteCode) return null;
  try {
    const response = await tenantHttp(siteCode, "/pages/privacy", {
      auth: options.auth ?? false,
    });
    return response?.page || null;
  } catch {
    return null;
  }
}

export const privacyApi = {
  async public(options = {}) {
    const siteCode = withSite(options.siteCode);
    const tenantPage = await fetchTenantPrivacy(siteCode);
    if (tenantPage?.content) {
      return tenantPage.content;
    }
    const data = await http("/privacy");
    return data?.privacy || EMPTY;
  },

  async manage(options = {}) {
    const siteCode = withSite(options.siteCode);
    const tenantPage = await fetchTenantPrivacy(siteCode, { auth: true });
    if (tenantPage?.content) {
      return tenantPage.content;
    }
    const data = await http("/privacy/manage", { auth: true });
    return data?.privacy || EMPTY;
  },

  async upsert(payload, options = {}) {
    const siteCode = withSite(options.siteCode);

    try {
      const response = await tenantHttp(siteCode, "/pages/privacy", {
        method: "PUT",
        body: {
          title: payload?.heroTitle || "Privacy Policy",
          slug: "privacy",
          content: payload,
          seo: payload?.seo || {},
        },
        auth: true,
      });
      return response?.page?.content || payload;
    } catch {
      /* fall back */
    }

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
