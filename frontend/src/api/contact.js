import { http } from "./client";

const CONTACT_ENDPOINT = "/contact";

export const contactConfigApi = {
  async get() {
    const data = await http(CONTACT_ENDPOINT);
    return data?.contact || null;
  },

  async update(payload) {
    const data = await http(CONTACT_ENDPOINT, {
      method: "PUT",
      body: payload,
      auth: true,
    });
    return data?.contact || null;
  },
};

export const contactMessageApi = {
  async submit(payload) {
    return http(`${CONTACT_ENDPOINT}/messages`, {
      method: "POST",
      body: payload,
    });
  },
};

// Medya (Cloudinary) basit upload helper'ı
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
    // beklenen: { url, publicId, width, height, format }
    return data;
  },
};

// Geriye dönük uyumluluk: eski bileşenler bu isimle çağırıyor
export const contactPageApi = {
  get: contactConfigApi.get,
  upsert: contactConfigApi.update,
};
