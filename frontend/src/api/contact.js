import { http, tenantHttp } from "./client.js";

const CONTACT_MESSAGES_ENDPOINT = "/contact/messages";

export const contactPageApi = {
  async get(siteCode) {
    if (!siteCode) {
      throw new Error("Site code is required to fetch contact page content");
    }
    const data = await tenantHttp(siteCode, "/pages/contact");
    return data?.page?.content || null;
  },

  async upsert(siteCode, content, options = {}) {
    if (!siteCode) {
      throw new Error("Site code is required to update contact page");
    }
    const payload = {
      title: options.title || "Contact",
      slug: options.slug || "contact",
      content: content ?? {},
      seo: options.seo || {},
    };

    const data = await tenantHttp(siteCode, "/pages/contact", {
      method: "PUT",
      body: payload,
      auth: true,
    });

    return data?.page?.content || payload.content;
  },
};

export const contactMessageApi = {
  async submit(siteCode, payload) {
    if (!siteCode) {
      throw new Error("Site code is required to submit contact message");
    }
    return tenantHttp(siteCode, CONTACT_MESSAGES_ENDPOINT, {
      method: "POST",
      body: payload,
    });
  },
};

// Media helper (Cloudinary upload) remains global
export const mediaApi = {
  async upload(file) {
    const form = new FormData();
    form.append("file", file);
    const data = await http("/media/upload", {
      method: "POST",
      body: form,
      auth: true,
      isForm: true,
    });
    return data;
  },
};
