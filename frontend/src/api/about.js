// src/api/about.js
import { http } from "./client.js";

export const aboutApi = {
  async get() {
    return await http("/about");
  },
  async update(formData) {
    return await http("/about", {
      method: "PUT",
      body: formData,
      auth: true,
    });
  },
};
