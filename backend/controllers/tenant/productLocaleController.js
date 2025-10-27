import Joi from "joi";
import slugify from "slugify";
import mongoose from "mongoose";
import Category from "../../models/Category.js";
import ProductBase from "../../models/ProductBase.js";
import ProductLocale from "../../models/ProductLocale.js";
import Inventory from "../../models/Inventory.js";
import { SITE_CODES } from "../../constants/sites.js";

const objectIdSchema = Joi.string().hex().length(24);

const seoSchema = Joi.object({
  title: Joi.string().allow("", null),
  description: Joi.string().allow("", null),
  keywords: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim()),
      Joi.string().trim()
    )
    .default([]),
});

const productLocaleSchema = Joi.object({
  name: Joi.string().trim().min(1).max(240).required(),
  description: Joi.string().allow("", null).default(""),
  details: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim()), Joi.string().allow("", null))
    .default([]),
  careInstructions: Joi.string().allow("", null).default(""),
  slug: Joi.string().trim().min(1).max(240).optional(),
  categoryId: objectIdSchema.allow(null, ""),
  seo: seoSchema.default({}),
});

function normalizeKeywords(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDetailsInput(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function shapeProduct(base, locale, inventory) {
  if (!base || !locale) return null;
  const inventoryPayload = inventory
    ? {
        totalStock: inventory.totalStock,
        reservedStock: inventory.reservedStock,
        variants: inventory.variants || [],
        updatedAt: inventory.updatedAt,
      }
    : null;

  const category = locale.categoryId
    ? {
        id: locale.categoryId._id
          ? locale.categoryId._id.toString()
          : locale.categoryId.toString(),
        name: locale.categoryId.name || "",
        slug: locale.categoryId.slug || "",
        parentId: locale.categoryId.parentId
          ? locale.categoryId.parentId.toString()
          : null,
        ancestors: Array.isArray(locale.categoryId.ancestors)
          ? locale.categoryId.ancestors.map((id) =>
              id?.toString ? id.toString() : String(id)
            )
          : [],
      }
    : null;

  const variants = (inventoryPayload?.variants || []).map((variant) => ({
    color: variant.color || null,
    size: variant.size || null,
    attributeValue: variant.attributeValue || null,
    stock: Number(variant.stock || 0),
  }));

  const totalStock = variants.length
    ? variants.reduce((acc, item) => acc + (item.stock || 0), 0)
    : inventoryPayload?.totalStock || 0;
  const inventoryShape = variants.length
    ? variants
    : inventoryPayload?.variants?.length
    ? inventoryPayload.variants
    : [];

  return {
    id: base._id.toString(),
    productId: base._id.toString(),
    localeId: locale._id.toString(),
    sku: base.sku,
    name: locale.name,
    slug: locale.slug,
    description: locale.description || "",
    details: Array.isArray(locale.details)
      ? locale.details
      : typeof locale.details === "string"
      ? locale.details.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
      : [],
    careInstructions: locale.careInstructions || "",
    price: base.basePrice,
    basePrice: base.basePrice,
    finalPrice: base.basePrice,
    currency: base.currency,
    images: base.images || [],
    colors: base.colors || [],
    sizes: base.sizes || [],
    showColors: base.showColors !== false,
    showSizes: base.showSizes !== false,
    customAttribute: base.customAttribute || {
      title: "",
      values: [],
      show: false,
    },
    listedInCatalog: base.listedInCatalog !== false,
    isActive: base.isActive !== false,
    category,
    categoryId: category ? category.id : null,
    locale: {
      siteCode: locale.siteCode,
      seo: locale.seo || {},
    },
    inventory: inventoryShape,
    totalStock,
    reservedStock: inventoryPayload?.reservedStock || 0,
    inStock: totalStock > 0,
    createdAt: base.createdAt || locale.createdAt,
    updatedAt: base.updatedAt || locale.updatedAt,
    discount: null,
  };
}

export async function upsertProductLocale(req, res) {
  try {
    const { siteCode } = req.tenant;
    const { productId } = req.params;

    if (objectIdSchema.validate(productId).error) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const baseProduct = await ProductBase.findById(productId);
    if (!baseProduct) {
      return res.status(404).json({ message: "Product base not found" });
    }

    const payload = await productLocaleSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    let categoryId = null;
    if (payload.categoryId) {
      categoryId = new mongoose.Types.ObjectId(payload.categoryId);
      const category = await Category.findOne({
        _id: categoryId,
        siteCode,
      });
      if (!category) {
        return res.status(400).json({ message: "Category not found in this site" });
      }
    }

    const slug =
      payload.slug && payload.slug.trim()
        ? slugify(payload.slug, { lower: true, strict: true })
        : undefined;

    let locale = await ProductLocale.findOne({
      productId: baseProduct._id,
      siteCode,
    });

    if (!locale) {
      locale = new ProductLocale({
        productId: baseProduct._id,
        siteCode,
      });
    }

    locale.name = payload.name;
    locale.description = payload.description ?? "";
    locale.details = normalizeDetailsInput(payload.details);
    locale.careInstructions = payload.careInstructions ?? "";
    if (slug) {
      locale.slug = slug;
    }
    locale.categoryId = categoryId;
    locale.seo = {
      title: payload.seo?.title || "",
      description: payload.seo?.description || "",
      keywords: normalizeKeywords(payload.seo?.keywords),
    };

    await locale.save();

    const inventory = baseProduct.inventoryId
      ? await Inventory.findOne({ _id: baseProduct.inventoryId })
      : await Inventory.findOne({ productId: baseProduct._id });

    res.json({
      product: shapeProduct(baseProduct, locale, inventory),
    });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }
    const status = error.code === 11000 ? 409 : 500;
    res.status(status).json({ message: error.message || "Failed to upsert product locale" });
  }
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

export async function listLocalizedProducts(req, res) {
  try {
    const { siteCode } = req.tenant;
    const { search, category } = req.query;
    const includeHidden = parseBoolean(req.query.includeHidden, false);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const filter = { siteCode };

    if (search && typeof search === "string") {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { slug: regex }];
    }

    if (category) {
      let categoryFilter = category;
      if (!objectIdSchema.validate(category).error) {
        categoryFilter = new mongoose.Types.ObjectId(category);
      } else {
        const categoryDoc = await Category.findOne({
          siteCode,
          slug: String(category),
        });
        if (!categoryDoc) {
          return res.json({ products: [], pagination: { total: 0 } });
        }
        categoryFilter = categoryDoc._id;
      }
      filter.categoryId = categoryFilter;
    }

    const locales = await ProductLocale.find(filter)
      .populate("categoryId")
      .sort({ createdAt: -1 })
      .lean();
    const productIds = locales
      .map((locale) => locale.productId)
      .filter(Boolean);
    const baseProducts = await ProductBase.find({
      _id: { $in: productIds },
    }).lean();
    const inventoryDocs = await Inventory.find({
      productId: { $in: productIds },
    }).lean();

    const baseMap = new Map(
      baseProducts.map((product) => [product._id.toString(), product])
    );
    const inventoryMap = new Map(
      inventoryDocs.map((inv) => [inv.productId.toString(), inv])
    );

    const shapedProducts = locales
      .map((locale) => {
        const base = baseMap.get(locale.productId.toString());
        if (!base) return null;
        const inventory = inventoryMap.get(locale.productId.toString());
        return shapeProduct(base, locale, inventory);
      })
      .filter(Boolean);

    const filteredProducts = includeHidden
      ? shapedProducts
      : shapedProducts.filter(
          (product) => product.listedInCatalog !== false && product.isActive !== false
        );

    const total = filteredProducts.length;
    const start = (page - 1) * limit;
    const paginated = filteredProducts.slice(start, start + limit);

    res.json({
      products: paginated,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to list products" });
  }
}

export async function getLocalizedProduct(req, res) {
  try {
    const { siteCode } = req.tenant;
    const { slug } = req.params;

    let locale = null;
    if (!objectIdSchema.validate(slug).error) {
      locale = await ProductLocale.findOne({
        siteCode,
        productId: new mongoose.Types.ObjectId(slug),
      })
        .populate("categoryId")
        .lean();
    }

    if (!locale) {
      locale = await ProductLocale.findOne({
        siteCode,
        slug,
      })
        .populate("categoryId")
        .lean();
    }

    if (!locale) {
      return res.status(404).json({ message: "Product not found" });
    }

    const base = await ProductBase.findById(locale.productId).lean();
    if (!base) {
      return res.status(404).json({ message: "Product base missing" });
    }

    const inventory = await Inventory.findOne({
      productId: base._id,
    }).lean();

    const shaped = shapeProduct(base, locale, inventory);
    if (!shaped) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ product: shaped });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch product" });
  }
}
