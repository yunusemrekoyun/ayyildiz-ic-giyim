// backend/controllers/productController.js
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";
import cloudinary, { configureCloudinary } from "../config/cloudinary.js";
import { hydrateProductsWithInventory } from "../utils/stockItemHelpers.js";

configureCloudinary();

const isId = (s) => typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);
const normalizeArray = (v) =>
  Array.isArray(v)
    ? v
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean)
    : typeof v === "string"
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

function parseBool(v, def = true) {
  if (v === undefined) return def;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(s);
}

async function resolveCategory(category) {
  if (!category) return null;
  const filter = isId(category) ? { _id: category } : { slug: category };
  const doc = await Category.findOne(filter);
  if (!doc) throw new Error("Category not found");
  return doc;
}

// Cloudinary upload (buffer üzerinden)
async function uploadImages(files = [], folderHint = "products") {
  if (!Array.isArray(files) || !files.length) return [];
  const baseFolder =
    cloudinary.uploadFolder /* set in config */ || "ayyildiz/products";
  const folder = `${baseFolder}/${folderHint}`;

  const uploads = files.map(async (file) => {
    const isVideo = file.mimetype?.startsWith("video/");
    const result = await uploadBufferToCloudinary(file.buffer, {
      folder,
      resource_type: isVideo ? "video" : "image",
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  });

  return Promise.all(uploads);
}

export async function createProduct(req, res) {
  try {
    const {
      name,
      price,
      description,
      careInstructions,
      details,
      category,
      colors,
      sizes,
      showColors,
      showSizes,
      customAttribute,
      isActive,
      listedInCatalog,
      sku,
    } = req.body;

    if (!name || price == null)
      return res
        .status(400)
        .json({ message: "Product name and price are required" });

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0)
      return res.status(400).json({ message: "Price must be a valid number" });

    const categoryDoc = category ? await resolveCategory(category) : null;

    // Görseller → Cloudinary
    const files = Array.isArray(req.files) ? req.files : [];
    const images = await uploadImages(files, "products");

    const doc = await Product.create({
      name: String(name).trim(),
      price: priceNum,
      description: description ?? "",
      careInstructions: careInstructions ?? "",
      details: normalizeArray(details),
      category: categoryDoc?._id ?? null,
      colors: normalizeArray(colors),
      sizes: normalizeArray(sizes),
      showColors: parseBool(showColors, true),
      showSizes: parseBool(showSizes, true),
      customAttribute:
        typeof customAttribute === "string"
          ? JSON.parse(customAttribute || "{}")
          : customAttribute || {},
      isActive: parseBool(isActive, true),
      listedInCatalog: parseBool(listedInCatalog, true),
      sku: sku ? String(sku).trim().toUpperCase() : undefined,
      images, // ← artık {url, publicId, ...} dolu
    });

    const populated = await doc.populate("category");
    await hydrateProductsWithInventory([populated]);
    res.status(201).json({ product: populated.toObject() });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.sku)
      return res.status(400).json({ message: "SKU already exists" });
    res.status(400).json({ message: err.message || "Create failed" });
  }
}

export async function listProducts(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const search = req.query.search?.trim();
    const includeHidden = parseBool(req.query.includeHidden, false);
    const category = req.query.category;

    const filter = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (!includeHidden)
      Object.assign(filter, { isActive: true, listedInCatalog: true });
    if (category) {
      const c = await resolveCategory(category);
      filter.category = c._id;
    }

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("category")
        .lean(),
      Product.countDocuments(filter),
    ]);

    await hydrateProductsWithInventory(items);

    res.json({
      products: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "List failed" });
  }
}

export async function getProduct(req, res) {
  try {
    const { idOrSlug } = req.params;
    const includeHidden = parseBool(req.query.includeHidden, false);
    const isAdmin = Boolean(req.user?.role === "admin");

    const product = isId(idOrSlug)
      ? await Product.findById(idOrSlug).populate("category")
      : await Product.findOne({ slug: idOrSlug }).populate("category");

    if (!product) return res.status(404).json({ message: "Product not found" });
    if (
      !includeHidden &&
      !isAdmin &&
      (!product.isActive || !product.listedInCatalog)
    ) {
      return res.status(404).json({ message: "Product not found" });
    }
    await hydrateProductsWithInventory([product]);
    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: err.message || "Get failed" });
  }
}

export async function updateProduct(req, res) {
  try {
    const { idOrSlug } = req.params;
    const product = isId(idOrSlug)
      ? await Product.findById(idOrSlug)
      : await Product.findOne({ slug: idOrSlug });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const {
      name,
      price,
      description,
      careInstructions,
      details,
      category,
      colors,
      sizes,
      showColors,
      showSizes,
      customAttribute,
      isActive,
      listedInCatalog,
      sku,
      removeImagePublicIds,
    } = req.body;

    if (name !== undefined) product.name = String(name).trim();
    if (price !== undefined) {
      const n = Number(price);
      if (!Number.isFinite(n) || n < 0)
        return res
          .status(400)
          .json({ message: "Price must be a valid number" });
      product.price = n;
    }
    if (description !== undefined) product.description = description;
    if (careInstructions !== undefined)
      product.careInstructions = careInstructions;
    if (details !== undefined) product.details = normalizeArray(details);
    if (colors !== undefined) product.colors = normalizeArray(colors);
    if (sizes !== undefined) product.sizes = normalizeArray(sizes);
    if (showColors !== undefined)
      product.showColors = parseBool(showColors, true);
    if (showSizes !== undefined) product.showSizes = parseBool(showSizes, true);
    if (customAttribute !== undefined)
      product.customAttribute =
        typeof customAttribute === "string"
          ? JSON.parse(customAttribute || "{}")
          : customAttribute || {};
    if (isActive !== undefined) product.isActive = parseBool(isActive, true);
    if (listedInCatalog !== undefined)
      product.listedInCatalog = parseBool(listedInCatalog, true);
    if (sku !== undefined)
      product.sku = sku ? String(sku).trim().toUpperCase() : undefined;

    // Görsel sil
    if (removeImagePublicIds) {
      const ids = Array.isArray(removeImagePublicIds)
        ? removeImagePublicIds
        : String(removeImagePublicIds)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      if (ids.length) {
        // DB’den çıkar
        product.images = product.images.filter(
          (img) => !ids.includes(img.publicId)
        );
        // Cloudinary’den sil (best-effort)
        await Promise.allSettled(
          ids.map((pid) => deleteFromCloudinary(pid, "image"))
        );
      }
    }

    // Yeni görseller (buffer → Cloudinary)
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length) {
      const imgs = await uploadImages(files, "products");
      product.images.push(...imgs);
    }

    await product.save();
    const populated = await product.populate("category");
    await hydrateProductsWithInventory([populated]);
    res.json({ product: populated });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.sku)
      return res.status(400).json({ message: "SKU already exists" });
    res.status(400).json({ message: err.message || "Update failed" });
  }
}

export async function deleteProduct(req, res) {
  try {
    const { idOrSlug } = req.params;
    const product = isId(idOrSlug)
      ? await Product.findById(idOrSlug)
      : await Product.findOne({ slug: idOrSlug });
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Cloudinary temizlik (best-effort)
    const ids = (product.images || [])
      .map((img) => img.publicId)
      .filter(Boolean);
    if (ids.length) {
      await Promise.allSettled(
        ids.map((pid) => deleteFromCloudinary(pid, "image"))
      );
    }

    await product.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message || "Delete failed" });
  }
}
