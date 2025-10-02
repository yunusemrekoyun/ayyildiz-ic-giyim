import Product from "../models/Product.js";
import Category from "../models/Category.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";

const isValidObjectId = (val) =>
  typeof val === "string" && val.match(/^[0-9a-fA-F]{24}$/);

const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => String(v).trim());
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed))
        return parsed.filter(Boolean).map((v) => String(v).trim());
    } catch (_) {
      // not JSON
    }
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeDetails = (value) => {
  const arr = normalizeArray(value);
  return arr.map((item) => String(item));
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(lower)) return true;
    if (["false", "0", "no", "off"].includes(lower)) return false;
  }
  return fallback;
};

const parseAttribute = (value) => {
  if (!value) return { title: "", values: [], show: false };
  let payload = value;
  if (typeof value === "string") {
    try {
      payload = JSON.parse(value);
    } catch (error) {
      return { title: value, values: [], show: true };
    }
  }
  if (typeof payload !== "object" || Array.isArray(payload)) {
    return { title: "", values: [], show: false };
  }
  const title = String(payload.title || "").trim();
  let values = [];
  if (Array.isArray(payload.values)) {
    values = payload.values.map((item) => String(item).trim()).filter(Boolean);
  } else if (typeof payload.values === "string") {
    values = payload.values
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return {
    title,
    values,
    show: parseBoolean(payload.show, true),
  };
};

const parseInventory = (value) => {
  if (!value) return [];
  let payload = value;
  if (typeof value === "string") {
    try {
      payload = JSON.parse(value);
    } catch (error) {
      return [];
    }
  }
  if (!Array.isArray(payload)) return [];

  const map = new Map();
  payload.forEach((item) => {
    if (!item) return;
    const color = sanitizeOption(item.color);
    const size = sanitizeOption(item.size);
    const attributeValue = sanitizeOption(item.attributeValue);
    const stock = Number(item.stock);
    const safeStock = Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0;
    const key = [color || "", size || "", attributeValue || ""].join("||");
    map.set(key, {
      color: color ?? null,
      size: size ?? null,
      attributeValue: attributeValue ?? null,
      stock: safeStock,
    });
  });

  return Array.from(map.values());
};

function sanitizeOption(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

const shapeProduct = (doc) => ({
  id: doc._id,
  name: doc.name,
  slug: doc.slug,
  price: doc.price,
  images: doc.images,
  colors: doc.colors,
  sizes: doc.sizes,
  showColors: doc.showColors !== undefined ? doc.showColors : true,
  showSizes: doc.showSizes !== undefined ? doc.showSizes : true,
  customAttribute: doc.customAttribute
    ? {
        title: doc.customAttribute.title || "",
        values: doc.customAttribute.values || [],
        show: Boolean(doc.customAttribute.show),
      }
    : { title: "", values: [], show: false },
  inventory: Array.isArray(doc.inventory)
    ? doc.inventory.map((item) => ({
        color: item?.color ?? null,
        size: item?.size ?? null,
        attributeValue: item?.attributeValue ?? null,
        stock: Number(item?.stock) || 0,
      }))
    : [],
  description: doc.description,
  careInstructions: doc.careInstructions,
  details: doc.details,
  category: doc.category,
  isActive: doc.isActive,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

async function resolveCategory(category) {
  if (!category) return null;
  const filter = isValidObjectId(category)
    ? { _id: category }
    : { slug: category };
  const found = await Category.findOne(filter);
  if (!found) throw new Error("Category not found");
  return found;
}

async function uploadImages(files) {
  const uploads = files.map(async (file) => {
    const result = await uploadBufferToCloudinary(file.buffer);
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
      inventory,
    } = req.body;

    if (!name || !price) {
      return res
        .status(400)
        .json({ message: "Product name and price are required" });
    }

    const parsedPrice = Number(price);
    if (Number.isNaN(parsedPrice)) {
      return res.status(400).json({ message: "Price must be a valid number" });
    }

    let categoryDoc = null;
    if (category) {
      categoryDoc = await resolveCategory(category);
    }

    let images = [];
    if (req.files?.length) {
      images = await uploadImages(req.files);
    }

    const product = await Product.create({
      name,
      price: parsedPrice,
      description: description ?? "",
      careInstructions: careInstructions ?? "",
      details: normalizeDetails(details),
      category: categoryDoc?._id ?? null,
      colors: normalizeArray(colors),
      sizes: normalizeArray(sizes),
      showColors: parseBoolean(showColors, true),
      showSizes: parseBoolean(showSizes, true),
      customAttribute: parseAttribute(customAttribute),
      inventory: parseInventory(inventory),
      images,
    });

    const populated = await product.populate("category");
    res.status(201).json({ product: shapeProduct(populated) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function listProducts(req, res) {
  try {
    const { page = 1, limit = 20, search, category } = req.query;
    const pageNumber = Math.max(1, Number(page));
    const pageSize = Math.min(100, Math.max(1, Number(limit)));

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (category) {
      const categoryDoc = await resolveCategory(category);
      const descendantIds = await collectDescendantIds(categoryDoc._id);
      filter.category = { $in: [categoryDoc._id, ...descendantIds] };
    }

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate("category")
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      products: items.map(shapeProduct),
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (error) {
    const status = error.message === "Category not found" ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
}

async function collectDescendantIds(categoryId) {
  const children = await Category.find({ ancestors: categoryId }, { _id: 1 });
  return children.map((c) => c._id);
}

export async function getProduct(req, res) {
  try {
    const { idOrSlug } = req.params;
    const product = isValidObjectId(idOrSlug)
      ? await Product.findById(idOrSlug).populate("category")
      : await Product.findOne({ slug: idOrSlug }).populate("category");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ product: shapeProduct(product) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function updateProduct(req, res) {
  try {
    const { idOrSlug } = req.params;
    const {
      name,
      price,
      description,
      careInstructions,
      details,
      category,
      colors,
      sizes,
      removeImagePublicIds,
      isActive,
      showColors,
      showSizes,
      customAttribute,
      inventory,
    } = req.body;

    const product = isValidObjectId(idOrSlug)
      ? await Product.findById(idOrSlug)
      : await Product.findOne({ slug: idOrSlug });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (name) product.name = name;
    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (Number.isNaN(parsedPrice)) {
        return res.status(400).json({ message: "Price must be a valid number" });
      }
      product.price = parsedPrice;
    }

    if (description !== undefined) product.description = description;
    if (careInstructions !== undefined)
      product.careInstructions = careInstructions;
    if (details !== undefined) product.details = normalizeDetails(details);
    if (colors !== undefined) product.colors = normalizeArray(colors);
    if (sizes !== undefined) product.sizes = normalizeArray(sizes);
    if (isActive !== undefined)
      product.isActive = isActive === "false" ? false : Boolean(isActive);
    if (showColors !== undefined)
      product.showColors = parseBoolean(showColors, product.showColors);
    if (showSizes !== undefined)
      product.showSizes = parseBoolean(showSizes, product.showSizes);
    if (customAttribute !== undefined)
      product.customAttribute = parseAttribute(customAttribute);
    if (inventory !== undefined)
      product.inventory = parseInventory(inventory);

    if (category !== undefined) {
      if (!category) product.category = null;
      else {
        const categoryDoc = await resolveCategory(category);
        product.category = categoryDoc._id;
      }
    }

    if (removeImagePublicIds) {
      const ids = normalizeArray(removeImagePublicIds);
      const deletions = [];
      product.images = product.images.filter((img) => {
        const shouldRemove = ids.includes(img.publicId);
        if (shouldRemove) {
          deletions.push(deleteFromCloudinary(img.publicId));
        }
        return !shouldRemove;
      });
      if (deletions.length) await Promise.allSettled(deletions);
    }

    if (req.files?.length) {
      const newImages = await uploadImages(req.files);
      product.images.push(...newImages);
    }

    await product.save();
    const populated = await product.populate("category");
    res.json({ product: shapeProduct(populated) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteProduct(req, res) {
  try {
    const { idOrSlug } = req.params;
    const product = isValidObjectId(idOrSlug)
      ? await Product.findById(idOrSlug)
      : await Product.findOne({ slug: idOrSlug });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Promise.all(product.images.map((img) => deleteFromCloudinary(img.publicId)));
    await product.deleteOne();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
