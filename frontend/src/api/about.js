// src/api/about.js
import { http, tenantHttp, resolveSiteCode } from "./client.js";

const withSite = (siteCode) => resolveSiteCode(siteCode);

async function fetchTenantAbout(siteCode) {
  if (!siteCode) return null;
  try {
    const data = await tenantHttp(siteCode, "/pages/about");
    return data?.page || null;
  } catch (error) {
    return null;
  }
}

export const aboutApi = {
  async get(options = {}) {
    const siteCode = withSite(options.siteCode);
    const page = await fetchTenantAbout(siteCode);
    if (page?.content) {
      return { about: page.content, page };
    }
    return await http("/about");
  },
  async update(formData, options = {}) {
    if (!(formData instanceof FormData)) {
      const siteCode = withSite(options.siteCode);
      const payload =
        typeof formData === "object" && formData !== null ? formData : {};
      const data = await tenantHttp(siteCode, "/pages/about", {
        method: "PUT",
        body: payload,
        auth: true,
      });
      return { about: data?.page?.content || payload, page: data?.page || null };
    }

    return await http("/about", {
      method: "PUT",
      body: formData,
      auth: true,
    });
  },
};
