import Joi from "joi";
import Inventory from "../../models/Inventory.js";
import ProductBase from "../../models/ProductBase.js";

const variantSchema = Joi.object({
  size: Joi.string().trim().required(),
  stock: Joi.number().integer().min(0).required(),
});

const inventorySchema = Joi.object({
  variants: Joi.array().items(variantSchema).optional(),
  totalStock: Joi.number().integer().min(0).optional(),
  reservedStock: Joi.number().integer().min(0).optional(),
});

export async function updateInventory(req, res) {
  try {
    const { productId } = req.params;
    if (!productId || !productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const payload = await inventorySchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const baseProduct = await ProductBase.findById(productId);
    if (!baseProduct) {
      return res.status(404).json({ message: "Product base not found" });
    }

    const updates = {};
    if (payload.variants) {
      updates.variants = payload.variants;
      updates.totalStock = payload.variants.reduce(
        (acc, variant) => acc + (variant.stock || 0),
        0
      );
    }

    if (payload.totalStock !== undefined) {
      updates.totalStock = payload.totalStock;
    }

    if (payload.reservedStock !== undefined) {
      updates.reservedStock = payload.reservedStock;
    }

    let inventory = await Inventory.findOne({ productId: baseProduct._id });
    if (!inventory) {
      inventory = await Inventory.create({
        productId: baseProduct._id,
        variants: updates.variants || [],
        totalStock: updates.totalStock || 0,
        reservedStock: updates.reservedStock || 0,
      });
    } else {
      Object.assign(inventory, updates);
      if (
        inventory.reservedStock !== undefined &&
        inventory.totalStock !== undefined &&
        inventory.reservedStock > inventory.totalStock
      ) {
        inventory.reservedStock = inventory.totalStock;
      }
      await inventory.save();
    }

    if (!baseProduct.inventoryId) {
      baseProduct.inventoryId = inventory._id;
      await baseProduct.save();
    }

    res.json({ inventory });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }
    res.status(500).json({ message: error.message || "Failed to update inventory" });
  }
}
