import mongoose from "mongoose";

const ShippingConfigSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Standard Shipping" },
    fee: { type: Number, default: 0 },
    freeThreshold: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ShippingConfigSchema.statics.getSingleton = async function () {
  const existing = await this.findOne();
  if (existing) return existing;
  return this.create({});
};

export default mongoose.model("ShippingConfig", ShippingConfigSchema);
