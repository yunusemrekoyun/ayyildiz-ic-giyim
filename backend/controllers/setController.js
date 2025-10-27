// backend/controllers/setController.js
import Set from "../models/Set.js";
import ProductLegacy from "../models/Product.js";
import ProductBase from "../models/ProductBase.js";
import ProductLocale from "../models/ProductLocale.js";
import Inventory from "../models/Inventory.js";
import { SITE_CODES, DEFAULT_SITE_CODE } from "../constants/sites.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";
import { parseBoolean } from "../utils/productHelpers.js";
import { shapeProduct as shapeLegacyProduct } from "../utils/productHelpers.js";
import {
  fetchActiveDiscounts,
  computeProductDiscountMap,
  mapDiscountsToSets,
  applyDiscount,
} from "../utils/discountHelpers.js";
import {
  recalculateSetStock,
  recalculateSetStockForSetIds,
  computeSetStockSnapshot,
} from "../utils/setStock.js";
import { shapeProduct as shapeLocalizedProduct } from "./tenant/productLocaleController.js";

const isValidObjectId = (val) =>
  typeof val === "string" && val.match(/^[0-9a-fA-F]{24}$/);

function resolveSiteCodeFromRequest(req) {
  const raw = req.query?.siteCode || req.body?.siteCode;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (SITE_CODES.includes(normalized)) return normalized;
  }
  return DEFAULT_SITE_CODE;
}

function setId(doc) {
  if (!doc) return null;
  return (
    doc._id?.toString?.() ||
    doc.id?.toString?.() ||
    (typeof doc === "string" ? doc : String(doc._id || doc.id || ""))
  );
}

// Sadece set'in kendi görselleri
async function processImages(files = []) {
  if (!files || !files.length) return [];
  const uploads = files.map((file) =>
    uploadBufferToCloudinary(file.buffer).then((result) => ({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    }))
  );
  return Promise.all(uploads);
}

async function shapeSetsWithDiscounts(sets, { siteCode }) {
  if (!sets?.length) return [];
  const activeDiscounts = await fetchActiveDiscounts();

  let setDiscountMap = new Map();
  let productDiscountMap = new Map();

  if (activeDiscounts.length) {
    setDiscountMap = mapDiscountsToSets(
      activeDiscounts,
      sets.map((set) => setId(set) || "")
    );

    const nestedProducts = [];
    sets.forEach((set) => {
      (set.products || []).forEach((entry) => {
        const product = entry?.product;
        const id = product?._id || product;
        if (id) nestedProducts.push({ _id: id });
      });
    });

    if (nestedProducts.length) {
      productDiscountMap = computeProductDiscountMap(
        activeDiscounts,
        nestedProducts
      );
    }
  }

  const shapedSets = [];
  for (const set of sets) {
    const id = setId(set) || "";
    const discount = setDiscountMap.get(id) || null;
    const shaped = await buildSetResponse(set, {
      siteCode,
      discount,
      productDiscountMap,
    });
    shapedSets.push(shaped);
  }

  return shapedSets;
}

async function shapeSetWithDiscount(set, { siteCode }) {
  if (!set) return null;
  const [shaped] = await shapeSetsWithDiscounts([set], { siteCode });
  return shaped || null;
}

export async function createSet(req, res) {
  try {
    const siteCode = resolveSiteCodeFromRequest(req);
    const { name, description = "", price, show = true } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ message: "Name and price are required" });
    }
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: "Price must be a valid number" });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const setImageFiles = files.filter((f) => f.fieldname === "images");

    const products = await resolveSetProducts(req.body.products, { siteCode });
    const images = await processImages(setImageFiles);

    let set = await Set.create({
      name,
      description,
      price: parsedPrice,
      show: parseBoolean(show, true),
      images,
      products,
      siteCode,
    });

    set = await recalculateSetStock(set);
    await set.populate({ path: "products.product" });
    const shaped = await shapeSetWithDiscount(set, { siteCode });
    res.status(201).json({ set: shaped });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function listSets(req, res) {
  try {
    const siteCode = resolveSiteCodeFromRequest(req);
    const includeHidden = parseBoolean(req.query.includeHidden, false);
    const filter = includeHidden ? {} : { show: true };

    if (siteCode === DEFAULT_SITE_CODE) {
      filter.$or = [
        { siteCode },
        { siteCode: { $exists: false } },
        { siteCode: null },
      ];
    } else {
      filter.siteCode = siteCode;
    }

    const sets = await Set.find(filter)
      .sort({ createdAt: -1 })
      .populate({ path: "products.product" });

    const refreshed = [];
    for (const set of sets) {
      const recalculated = await recalculateSetStock(set);
      await (recalculated || set).populate({ path: "products.product" });
      const working = recalculated || set;
      working.stock = computeSetStockSnapshot(working.toObject ? working.toObject() : working);
      refreshed.push(working);
    }

    const shaped = await shapeSetsWithDiscounts(refreshed, { siteCode });
    res.json({ sets: shaped });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function getSet(req, res) {
  try {
    const { idOrSlug } = req.params;
    const siteCode = resolveSiteCodeFromRequest(req);
    let set;
    if (isValidObjectId(idOrSlug)) {
      set = await Set.findById(idOrSlug);
      if (
        set &&
        set.siteCode &&
        set.siteCode.toLowerCase() !== siteCode.toLowerCase()
      ) {
        return res.status(404).json({ message: "Set not found" });
      }
    } else {
      const slugQuery =
        siteCode === DEFAULT_SITE_CODE
          ? {
              slug: idOrSlug,
              $or: [
                { siteCode },
                { siteCode: { $exists: false } },
                { siteCode: null },
              ],
            }
          : { slug: idOrSlug, siteCode };
      set = await Set.findOne(slugQuery);
    }

    if (!set) return res.status(404).json({ message: "Set not found" });

    const refreshed = await recalculateSetStock(set);
    const workingSet = refreshed || set;

    await workingSet.populate({ path: "products.product" });

    const shaped = await shapeSetWithDiscount(workingSet, { siteCode });
    res.json({ set: shaped });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function updateSet(req, res) {
  try {
    const { idOrSlug } = req.params;
    const siteCode = resolveSiteCodeFromRequest(req);
    let set;
    if (isValidObjectId(idOrSlug)) {
      set = await Set.findById(idOrSlug);
    } else {
      const slugQuery =
        siteCode === DEFAULT_SITE_CODE
          ? {
              slug: idOrSlug,
              $or: [
                { siteCode },
                { siteCode: { $exists: false } },
                { siteCode: null },
              ],
            }
          : { slug: idOrSlug, siteCode };
      set = await Set.findOne(slugQuery);
    }

    if (
      !set ||
      (set.siteCode &&
        set.siteCode.toLowerCase() !== siteCode.toLowerCase())
    ) {
      return res.status(404).json({ message: "Set not found" });
    }

    if (!set.siteCode) {
      set.siteCode = siteCode;
    }

    const { name, description, price, show } = req.body;

    if (name !== undefined) set.name = name;
    if (description !== undefined) set.description = description;
    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res
          .status(400)
          .json({ message: "Price must be a valid number" });
      }
      set.price = parsedPrice;
    }
    if (show !== undefined) set.show = parseBoolean(show, set.show);

    const files = Array.isArray(req.files) ? req.files : [];
    const setImageFiles = files.filter((f) => f.fieldname === "images");

    if (req.body.products !== undefined) {
      set.products = await resolveSetProducts(req.body.products, { siteCode });
    }

    const removeImageIds = parseIdList(req.body.removeImagePublicIds);
    if (removeImageIds.length) {
      await Promise.all(removeImageIds.map((id) => deleteFromCloudinary(id)));
      set.images = set.images.filter(
        (image) => !removeImageIds.includes(image.publicId)
      );
    }

    if (setImageFiles.length) {
      const newImages = await processImages(setImageFiles);
      set.images.push(...newImages);
    }

    await set.save();
    await recalculateSetStockForSetIds([set._id]);
    await set.populate({ path: "products.product" });
    const shaped = await shapeSetWithDiscount(set, { siteCode });
    res.json({ set: shaped });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteSet(req, res) {
  try {
    const { idOrSlug } = req.params;
    const siteCode = resolveSiteCodeFromRequest(req);
    let set;
    if (isValidObjectId(idOrSlug)) {
      set = await Set.findById(idOrSlug);
    } else {
      const slugQuery =
        siteCode === DEFAULT_SITE_CODE
          ? {
              slug: idOrSlug,
              $or: [
                { siteCode },
                { siteCode: { $exists: false } },
                { siteCode: null },
              ],
            }
          : { slug: idOrSlug, siteCode };
      set = await Set.findOne(slugQuery);
    }

    if (
      !set ||
      (set.siteCode &&
        set.siteCode.toLowerCase() !== siteCode.toLowerCase())
    ) {
      return res.status(404).json({ message: "Set not found" });
    }

    await Promise.all(
      set.images.map((img) => deleteFromCloudinary(img.publicId))
    );
    await set.deleteOne();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function resolveSetProducts(value, { siteCode } = {}) {
  if (!value) return [];
  let payload = value;
  if (typeof value === "string") {
    try {
      payload = JSON.parse(value);
    } catch {
      throw new Error("Invalid products payload");
    }
  }
  if (!Array.isArray(payload))
    throw new Error("Products payload must be an array");

  const products = [];
  for (const item of payload) {
    const productIdentifier = normalizeProductIdentifier(item);
    if (!productIdentifier) {
      throw new Error("Each product must include productId");
    }
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const resolved = await findProductReference(productIdentifier, {
      siteCode,
    });
    if (!resolved) {
      throw new Error("Product not found: " + productIdentifier);
    }
    products.push({
      product: resolved.product,
      productModel: resolved.productModel,
      quantity,
    });
  }
  return products;
}

function normalizeProductIdentifier(item) {
  if (!item) return null;
  let candidate =
    item.productId ??
    item.product?.productId ??
    item.product?.id ??
    item.product?._id ??
    item.product ??
    item.id ??
    item._id ??
    null;

  if (!candidate) return null;
  if (typeof candidate === "object") {
    const nested = candidate._id || candidate.id;
    return nested ? String(nested).trim() : null;
  }
  return String(candidate).trim();
}

async function findProductReference(identifier, { siteCode } = {}) {
  if (!identifier) return null;
  const value = String(identifier).trim();
  if (!value) return null;

  // 1) Legacy product by ObjectId
  if (isValidObjectId(value)) {
    const legacy = await ProductLegacy.findById(value)
      .select("_id")
      .lean();
    if (legacy?._id) {
      return { product: legacy._id, productModel: "Product" };
    }
  }

  // 2) Tenant product base by ObjectId
  if (isValidObjectId(value)) {
    const baseProduct = await ProductBase.findById(value)
      .select("_id")
      .lean();
    if (baseProduct?._id) {
      return { product: baseProduct._id, productModel: "ProductBase" };
    }

    const localeQuery = { _id: value };
    if (siteCode) localeQuery.siteCode = siteCode;
    const localeDoc = await ProductLocale.findOne(localeQuery)
      .select("productId")
      .lean();
    if (localeDoc?.productId) {
      const baseFromLocale = await ProductBase.findById(localeDoc.productId)
        .select("_id")
        .lean();
      if (baseFromLocale?._id) {
        return { product: baseFromLocale._id, productModel: "ProductBase" };
      }
    }
  }

  // 3) Legacy product by slug
  const legacyBySlug = await ProductLegacy.findOne({ slug: value })
    .select("_id")
    .lean();
  if (legacyBySlug?._id) {
    return { product: legacyBySlug._id, productModel: "Product" };
  }

  // 4) Tenant locale slug -> base product
  const localeSlugQuery = { slug: value };
  if (siteCode) localeSlugQuery.siteCode = siteCode;
  const localeBySlug = await ProductLocale.findOne(localeSlugQuery)
    .select("productId")
    .lean();
  if (localeBySlug?.productId) {
    const baseFromLocale = await ProductBase.findById(localeBySlug.productId)
      .select("_id")
      .lean();
    if (baseFromLocale?._id) {
      return { product: baseFromLocale._id, productModel: "ProductBase" };
    }
  }

  return null;
}
async function buildSetResponse(
  doc,
  { siteCode, discount = null, productDiscountMap = new Map() } = {}
) {
  const plain = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
  const id = plain._id?.toString?.() || String(plain._id);

  const normalizedDiscount = discount
    ? {
        id: discount.id || discount._id?.toString?.() || String(discount._id),
        name: discount.name,
        percentage: Number(discount.percentage) || 0,
        description: discount.description || "",
      }
    : null;

  const basePrice = Number(plain.price) || 0;
  const { finalPrice } = applyDiscount(basePrice, normalizedDiscount);

  const products = [];
  for (const entry of plain.products || []) {
    const product = await hydrateProductEntry(entry, siteCode);
    const productId = product?.id;
    const productDiscount = productId
      ? productDiscountMap.get(productId) || null
      : null;
    if (product && productDiscount) {
      product.discount = productDiscount;
      product.hasDiscount = Boolean(productDiscount);
    }
    products.push({
      quantity: entry.quantity,
      product,
    });
  }

  return {
    id,
    name: plain.name,
    slug: plain.slug,
    description: plain.description,
    price: basePrice,
    finalPrice,
    discount: normalizedDiscount,
    hasDiscount: Boolean(normalizedDiscount) && basePrice !== finalPrice,
    show: plain.show,
    stock: plain.stock,
    images: plain.images,
    products,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    siteCode: plain.siteCode || DEFAULT_SITE_CODE,
  };
}

async function hydrateProductEntry(entry, siteCode) {
  if (!entry) return null;
  const model = entry.productModel || "Product";
  const productDoc = entry.product;
  const productId = productDoc?._id || productDoc;

  if (!productId) return null;

  if (model === "ProductBase") {
    const base =
      productDoc && productDoc.basePrice !== undefined
        ? productDoc
        : await ProductBase.findById(productId).lean();
    if (!base) return null;

    const locale = await ProductLocale.findOne({
      productId: base._id || base.id,
      siteCode,
    })
      .populate("categoryId")
      .lean()
      .catch(() => null);

    const inventory = await Inventory.findOne({
      productId: base._id || base.id,
    })
      .lean()
      .catch(() => null);

    const shaped = shapeLocalizedProduct(base, locale, inventory);
    if (shaped) return shaped;

    return {
      id: (base._id || base.id || "").toString(),
      name: locale?.name || base.sku || "Product",
      price: base.basePrice,
      basePrice: base.basePrice,
      finalPrice: base.basePrice,
      currency: base.currency,
      images: base.images || [],
      inventory: inventory?.variants || [],
      totalStock: inventory?.totalStock || 0,
      listedInCatalog: base.listedInCatalog !== false,
      isActive: base.isActive !== false,
    };
  }

  const legacy =
    productDoc && productDoc.name !== undefined
      ? productDoc
      : await ProductLegacy.findById(productId).lean();
  if (!legacy) return null;
  return shapeLegacyProduct(legacy, { discount: null });
}

function parseIdList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}
