import { http } from "./client.js";

export const shippingApi = {
  async getConfig() {
    const data = await http("/shipping");
    return (
      data?.shipping || {
        name: "Standard Shipping",
        fee: 0,
        freeThreshold: 0,
      }
    );
  },
  async updateConfig(payload) {
    const data = await http("/shipping", {
      method: "PUT",
      body: payload,
      auth: true,
    });
    return data?.shipping || null;
  },
};
