import { http, toQueryString } from "./client.js";

export const mediaApi = {
  async usage() {
    const data = await http("/media/usage", { auth: true });
    return data.usage;
  },
  async list(params = {}) {
    const qs = toQueryString(params);
    const data = await http(`/media/resources${qs}`, { auth: true });
    return data;
  },
  async remove(publicId, params = {}) {
    const qs = toQueryString(params);
    return http(`/media/resources/${encodeURIComponent(publicId)}${qs}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
