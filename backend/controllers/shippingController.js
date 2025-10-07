import ShippingConfig from "../models/ShippingConfig.js";

function shape(config) {
  if (!config) return null;
  return {
    id: config._id.toString(),
    name: config.name,
    fee: Number(config.fee || 0),
    freeThreshold: Number(config.freeThreshold || 0),
    updatedAt: config.updatedAt,
  };
}

export async function getShippingConfig(req, res) {
  try {
    const config = await ShippingConfig.getSingleton();
    res.json({ shipping: shape(config) });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Unable to load shipping config" });
  }
}

export async function updateShippingConfig(req, res) {
  try {
    const { name, fee, freeThreshold } = req.body || {};
    const config = await ShippingConfig.getSingleton();

    if (name !== undefined) config.name = String(name).trim() || "Standard Shipping";

    if (fee !== undefined) {
      const value = Number(fee);
      if (!Number.isFinite(value) || value < 0)
        return res.status(400).json({ message: "Shipping fee must be >= 0" });
      config.fee = value;
    }

    if (freeThreshold !== undefined) {
      const value = Number(freeThreshold);
      if (!Number.isFinite(value) || value < 0)
        return res
          .status(400)
          .json({ message: "Free shipping threshold must be >= 0" });
      config.freeThreshold = value;
    }

    await config.save();
    res.json({ shipping: shape(config) });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Unable to update shipping config" });
  }
}
