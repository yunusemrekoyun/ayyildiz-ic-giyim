import mongoose from "mongoose";
import slugify from "slugify";
import ProductBase from "../../models/ProductBase.js";
import ProductLocale from "../../models/ProductLocale.js";
import Inventory from "../../models/Inventory.js";
import Category from "../../models/Category.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinaryUpload.js";
import { configureCloudinary } from "../../config/cloudinary.js";
import {
  normalizeArray,
  parseBoolean,
  parseAttribute,
  parseInventory,
} from "../../utils/productHelpers.js";
import { shapeProduct } from "./productLocaleController.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

function ensureArray(value) {
  if (!value) return [];
  let source = value;
  if (!Array.isArray(value)) {
    try {
      const parsed = JSON.parse(value);
      source = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      source = String(value)
        .split(",")
        .map((item) => item.trim());
    }
  }
  return (Array.isArray(source) ? source : [source])
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function dedupe(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => (value == null ? null : String(value).trim()))
        .filter(Boolean)
    )
  );
}

function parseDetails(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseRemoveImageIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).map(String);
    }
  } catch {
    /* ignore parse error and fall through */
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCategoryId(raw) {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null) {
    const candidate = raw._id || raw.id;
    if (candidate && objectIdPattern.test(String(candidate))) {
      return new mongoose.Types.ObjectId(candidate);
    }
  }
  const stringInput = String(raw).trim();
  if (!objectIdPattern.test(stringInput)) return null;
  return new mongoose.Types.ObjectId(stringInput);
}

function toInventoryVariants(payload = []) {
  return payload.map((item) => ({
    color: item.color ?? null,
    size: item.size ?? null,
    attributeValue: item.attributeValue ?? null,
    stock: Math.max(0, Number(item.stockCatalog ?? item.stock ?? 0) || 0),
  }));
}

function computeTotalStock(variants = []) {
  return variants.reduce((acc, variant) => acc + (variant.stock || 0), 0);
}

function resolveUploadFolder() {
  const instance = configureCloudinary();
  const base = (instance.uploadFolder || "ayyildiz/products").replace(/\/+$/, "");
  return `${base}/catalog`;
}

function extractUploadFiles(req) {
  if (!req?.files) return [];
  if (Array.isArray(req.files)) return req.files;
  const images = req.files.images;
  if (!images) return [];
  return Array.isArray(images) ? images : [images];
}

async function generateSku(name, desired) {
  const baseInput = (desired || name || "").trim();
  const slug =
    slugify(baseInput, { lower: true, strict: true, trim: true }) ||
    `sku-${Date.now().toString(36)}`;
  let candidate = slug.toUpperCase();
  let counter = 1;

  while (await ProductBase.exists({ sku: candidate })) {
    counter += 1;
    candidate = `${slug.toUpperCase()}-${counter}`;
  }

  return candidate;
}

async function resolveCategoryForSite(rawCategory, siteCode) {
  const categoryId = parseCategoryId(rawCategory);
  if (!categoryId) return null;
  const category = await Category.findOne({ _id: categoryId, siteCode });
  if (!category) {
    throw new Error("Category not found in this site");
  }
  return category;
}

async function buildUploadedImages(files = []) {
  if (!files.length) return [];
  const folder = resolveUploadFolder();
  const uploaded = await Promise.all(
    files.map(async (file) => {
      const result = await uploadBufferToCloudinary(file.buffer, {
        folder,
      });
      return {
        publicId: result.public_id,
        url: result.secure_url,
        w: result.width,
        h: result.height,
        format: result.format,
      };
    })
  );
  return uploaded;
}

export async function createTenantProduct(req, res) {
  try {
    const { siteCode } = req.tenant || {};
    if (!siteCode) {
      return res.status(500).json({ message: "Tenant context is missing" });
    }

    const name = String(req.body.name || "").trim();
    const priceValue = Number(req.body.price);

    if (!name) {
      return res.status(400).json({ message: "Product name is required" });
    }
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      return res.status(400).json({ message: "Product price must be a positive number" });
    }

    const showColors = parseBoolean(req.body.showColors, true);
    const showSizes = parseBoolean(req.body.showSizes, true);
    const isActive = parseBoolean(req.body.isActive, true);
    const listedInCatalog = parseBoolean(
      req.body.listedInCatalog,
      true
    );

    const colors = showColors ? dedupe(normalizeArray(req.body.colors)) : [];
    const sizes = showSizes ? dedupe(normalizeArray(req.body.sizes)) : [];
    const customAttribute = parseAttribute(req.body.customAttribute);

    const inventoryPayload = toInventoryVariants(parseInventory(req.body.inventory));
    const totalStock = computeTotalStock(inventoryPayload);

    const images = await buildUploadedImages(extractUploadFiles(req));

    const baseProduct = await ProductBase.create({
      sku: await generateSku(name, req.body.sku),
      basePrice: priceValue,
      currency: "EUR",
      images,
      colors,
      sizes,
      showColors,
      showSizes,
      customAttribute: {
        title: customAttribute.title || "",
        values: dedupe(customAttribute.values || []),
        show: !!customAttribute.show,
      },
      listedInCatalog,
      isActive,
    });

    let inventoryDoc = null;
    if (inventoryPayload.length) {
      inventoryDoc = await Inventory.create({
        productId: baseProduct._id,
        variants: inventoryPayload,
        totalStock,
        reservedStock: 0,
      });
      baseProduct.inventoryId = inventoryDoc._id;
      await baseProduct.save();
    }

    const category = await resolveCategoryForSite(req.body.category || req.body.categoryId, siteCode);

    const locale = await ProductLocale.create({
      productId: baseProduct._id,
      siteCode,
      name,
      description: String(req.body.description || ""),
      details: parseDetails(req.body.details),
      careInstructions: String(req.body.careInstructions || ""),
      categoryId: category ? category._id : null,
      seo: {
        title: String(req.body.seoTitle || ""),
        description: String(req.body.seoDescription || ""),
        keywords: ensureArray(req.body.seoKeywords),
      },
    });

    res.status(201).json({
      product: shapeProduct(
        baseProduct.toObject(),
        locale.toObject(),
        inventoryDoc ? inventoryDoc.toObject() : null
      ),
    });
  } catch (error) {
    console.error("[tenant:create-product] error:", error);
    if (error.message === "Category not found in this site") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || "Failed to create product" });
  }
}

export async function updateTenantProduct(req, res) {
  try {
    const { siteCode } = req.tenant || {};
    if (!siteCode) {
      return res.status(500).json({ message: "Tenant context is missing" });
    }

    const { id } = req.params;
    if (!id || !objectIdPattern.test(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const baseProduct = await ProductBase.findById(id);
    if (!baseProduct) {
      return res.status(404).json({ message: "Product base not found" });
    }

    const locale = await ProductLocale.findOne({
      productId: baseProduct._id,
      siteCode,
    });

    if (!locale) {
      return res.status(404).json({ message: "Product locale not found in this site" });
    }

    if (req.body.price !== undefined) {
      const priceValue = Number(req.body.price);
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        return res.status(400).json({ message: "Product price must be a positive number" });
      }
      baseProduct.basePrice = priceValue;
    }

    if (req.body.showColors !== undefined) {
      baseProduct.showColors = parseBoolean(req.body.showColors, true);
    }
    if (req.body.showSizes !== undefined) {
      baseProduct.showSizes = parseBoolean(req.body.showSizes, true);
    }
    if (req.body.isActive !== undefined) {
      baseProduct.isActive = parseBoolean(req.body.isActive, true);
    }
    if (req.body.listedInCatalog !== undefined) {
      baseProduct.listedInCatalog = parseBoolean(req.body.listedInCatalog, true);
    }

    if (req.body.colors !== undefined) {
      baseProduct.colors = baseProduct.showColors
        ? dedupe(normalizeArray(req.body.colors))
        : [];
    }
    if (req.body.sizes !== undefined) {
      baseProduct.sizes = baseProduct.showSizes
        ? dedupe(normalizeArray(req.body.sizes))
        : [];
    }
    if (req.body.customAttribute !== undefined) {
      const customAttribute = parseAttribute(req.body.customAttribute);
      baseProduct.customAttribute = {
        title: customAttribute.title || "",
        values: dedupe(customAttribute.values || []),
        show: !!customAttribute.show,
      };
    }

    const removeImageIds = parseRemoveImageIds(req.body.removeImagePublicIds);
    if (removeImageIds.length) {
      baseProduct.images = (baseProduct.images || []).filter((image) => {
        const keep = !removeImageIds.includes(image.publicId);
        if (!keep && image.publicId) {
          deleteFromCloudinary(image.publicId).catch(() => {
            /* ignore deletion error */
          });
        }
        return keep;
      });
    }

    const newImages = await buildUploadedImages(extractUploadFiles(req));
    if (newImages.length) {
      baseProduct.images = [...(baseProduct.images || []), ...newImages];
    }

    await baseProduct.save();

    let inventory = await Inventory.findOne({ productId: baseProduct._id });

    if (req.body.inventory !== undefined) {
      const inventoryPayload = parseInventory(req.body.inventory);
      const variants = toInventoryVariants(inventoryPayload);
      if (!inventory && variants.length) {
        inventory = new Inventory({ productId: baseProduct._id });
      }

      if (inventory) {
        inventory.variants = variants;
        inventory.totalStock = computeTotalStock(variants);
        inventory.reservedStock = Math.min(
          inventory.reservedStock || 0,
          inventory.totalStock
        );
        await inventory.save();
        if (!baseProduct.inventoryId) {
          baseProduct.inventoryId = inventory._id;
          await baseProduct.save();
        }
      }
    } else if (inventory && !baseProduct.inventoryId) {
      baseProduct.inventoryId = inventory._id;
      await baseProduct.save();
    }

    if (req.body.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) {
        return res.status(400).json({ message: "Product name cannot be empty" });
      }
      locale.name = name;
    }

    if (req.body.description !== undefined) {
      locale.description = String(req.body.description || "");
    }
    if (req.body.details !== undefined) {
      locale.details = parseDetails(req.body.details);
    }
    if (req.body.careInstructions !== undefined) {
      locale.careInstructions = String(req.body.careInstructions || "");
    }

    if (req.body.category !== undefined || req.body.categoryId !== undefined) {
      if (!req.body.category && !req.body.categoryId) {
        locale.categoryId = null;
      } else {
        const category = await resolveCategoryForSite(
          req.body.category || req.body.categoryId,
          siteCode
        );
        locale.categoryId = category ? category._id : null;
      }
    }

    if (req.body.seoTitle !== undefined || req.body.seoDescription !== undefined || req.body.seoKeywords !== undefined) {
      locale.seo = {
        title:
          req.body.seoTitle !== undefined
            ? String(req.body.seoTitle || "")
            : locale.seo?.title || "",
        description:
          req.body.seoDescription !== undefined
            ? String(req.body.seoDescription || "")
            : locale.seo?.description || "",
        keywords:
          req.body.seoKeywords !== undefined
            ? ensureArray(req.body.seoKeywords)
            : locale.seo?.keywords || [],
      };
    }

    await locale.save();

    const shaped = shapeProduct(
      baseProduct.toObject(),
      locale.toObject(),
      inventory ? inventory.toObject() : null
    );

    res.json({ product: shaped });
  } catch (error) {
    console.error("[tenant:update-product] error:", error);
    if (error.message === "Category not found in this site") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || "Failed to update product" });
  }
}

export async function deleteTenantProduct(req, res) {
  try {
    const { siteCode } = req.tenant || {};
    if (!siteCode) {
      return res.status(500).json({ message: "Tenant context is missing" });
    }

    const { id } = req.params;
    if (!id || !objectIdPattern.test(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const baseProduct = await ProductBase.findById(id);
    if (!baseProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const locale = await ProductLocale.findOneAndDelete({
      productId: baseProduct._id,
      siteCode,
    });

    if (!locale) {
      return res.status(404).json({ message: "Product locale not found in this site" });
    }

    const remainingLocales = await ProductLocale.countDocuments({
      productId: baseProduct._id,
    });

    if (remainingLocales === 0) {
      const inventory = await Inventory.findOne({ productId: baseProduct._id });
      if (inventory) {
        await inventory.deleteOne();
      }
      const images = baseProduct.images || [];
      await baseProduct.deleteOne();
      images.forEach((image) => {
        if (!image?.publicId) return;
        deleteFromCloudinary(image.publicId).catch(() => {
          /* ignore */
        });
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("[tenant:delete-product] error:", error);
    res.status(500).json({ message: error.message || "Failed to delete product" });
  }
}
