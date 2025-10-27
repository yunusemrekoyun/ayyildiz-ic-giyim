import Joi from "joi";
import mongoose from "mongoose";
import ProductBase from "../../models/ProductBase.js";
import Inventory from "../../models/Inventory.js";

const imageSchema = Joi.object({
  publicId: Joi.string().trim().required(),
  url: Joi.string().uri().required(),
  w: Joi.number().integer().min(0).optional(),
  h: Joi.number().integer().min(0).optional(),
  format: Joi.string().trim().optional(),
});

const stringArraySchema = Joi.alternatives().try(
  Joi.array().items(Joi.string().trim()),
  Joi.string().trim()
);

const customAttributeSchema = Joi.object({
  title: Joi.string().allow("", null).default(""),
  values: stringArraySchema.default([]),
  show: Joi.boolean().default(false),
}).default({ title: "", values: [], show: false });

const normalizeArrayInput = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const baseProductSchema = Joi.object({
  sku: Joi.string().trim().min(1).max(120).required(),
  basePrice: Joi.number().min(0).required(),
  currency: Joi.string().valid("EUR").default("EUR"),
  images: Joi.array().items(imageSchema).default([]),
  inventoryId: Joi.string().hex().length(24).optional(),
  colors: stringArraySchema.default([]),
  sizes: stringArraySchema.default([]),
  showColors: Joi.boolean().default(true),
  showSizes: Joi.boolean().default(true),
  customAttribute: customAttributeSchema,
  listedInCatalog: Joi.boolean().default(true),
  isActive: Joi.boolean().default(true),
});

const updateProductSchema = baseProductSchema.fork(
  ["sku", "basePrice"],
  (schema) => schema.optional()
);

export async function createProductBase(req, res) {
  try {
    const payload = await baseProductSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    let inventoryId = null;
    if (payload.inventoryId) {
      inventoryId = new mongoose.Types.ObjectId(payload.inventoryId);
      const inventory = await Inventory.findById(inventoryId);
      if (!inventory) {
        return res.status(400).json({ message: "Inventory not found" });
      }
    }

    const product = await ProductBase.create({
      sku: payload.sku,
      basePrice: payload.basePrice,
      currency: payload.currency || "EUR",
      inventoryId,
      images: payload.images,
      colors: normalizeArrayInput(payload.colors),
      sizes: normalizeArrayInput(payload.sizes),
      showColors: payload.showColors,
      showSizes: payload.showSizes,
      customAttribute: {
        title: payload.customAttribute?.title || "",
        values: normalizeArrayInput(payload.customAttribute?.values),
        show: payload.customAttribute?.show ?? false,
      },
      listedInCatalog: payload.listedInCatalog,
      isActive: payload.isActive,
    });

    res.status(201).json({ product });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }
    const status = error.code === 11000 ? 409 : 500;
    res.status(status).json({ message: error.message || "Failed to create product" });
  }
}

export async function updateProductBase(req, res) {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const payload = await updateProductSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      prefs: { noDefaults: true },
    });

    const product = await ProductBase.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (payload.sku) product.sku = payload.sku;
    if (payload.basePrice !== undefined) product.basePrice = payload.basePrice;
    if (payload.currency) product.currency = payload.currency;
    if (payload.images) product.images = payload.images;
    if (payload.colors !== undefined)
      product.colors = normalizeArrayInput(payload.colors);
    if (payload.sizes !== undefined)
      product.sizes = normalizeArrayInput(payload.sizes);
    if (payload.showColors !== undefined)
      product.showColors = !!payload.showColors;
    if (payload.showSizes !== undefined)
      product.showSizes = !!payload.showSizes;
    if (payload.customAttribute) {
      product.customAttribute = {
        title: payload.customAttribute.title || "",
        values: normalizeArrayInput(payload.customAttribute.values),
        show: payload.customAttribute.show ?? false,
      };
    }
    if (payload.listedInCatalog !== undefined)
      product.listedInCatalog = !!payload.listedInCatalog;
    if (payload.isActive !== undefined)
      product.isActive = !!payload.isActive;

    if (payload.inventoryId) {
      const inventory = await Inventory.findById(payload.inventoryId);
      if (!inventory) {
        return res.status(400).json({ message: "Inventory not found" });
      }
      product.inventoryId = inventory._id;
    }

    await product.save();
    res.json({ product });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }
    const status = error.code === 11000 ? 409 : 500;
    res.status(status).json({ message: error.message || "Failed to update product" });
  }
}
