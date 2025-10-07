import Set from "../models/Set.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";
import {
  normalizeArray,
  parseBoolean,
  parseAttribute,
  parseInventory,
  sanitizeOption,
  shapeProduct,
  computeAvailableStock,
} from "../utils/productHelpers.js";

const isValidObjectId = (val) =>
  typeof val === "string" && val.match(/^[0-9a-fA-F]{24}$/);

export async function createSet(req, res) {
  try {
    const { name, description = "", price, show = true } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ message: "Name and price are required" });
    }
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: "Price must be a valid number" });
    }

    const { products, createdProducts } = await resolveSetProducts(req.body.products);

    const images = await processImages(req.files);

    const set = await Set.create({
      name,
      description,
      price: parsedPrice,
      show: parseBoolean(show, true),
      images,
      products,
    });

    const updated = await updateSetStock(set._id);
    await updated.populate({
      path: "products.product",
      populate: { path: "category" },
    });
    res.status(201).json({ set: shapeSet(updated), createdProducts });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function listSets(req, res) {
  try {
    const includeHidden = parseBoolean(req.query.includeHidden, false);
    const filter = includeHidden ? {} : { show: true };

    const sets = await Set.find(filter)
      .sort({ createdAt: -1 })
      .populate({ path: "products.product", populate: { path: "category" } })
      .lean();

    res.json({ sets: sets.map(shapeSet) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function getSet(req, res) {
  try {
    const { idOrSlug } = req.params;
    const set = isValidObjectId(idOrSlug)
      ? await Set.findById(idOrSlug)
      : await Set.findOne({ slug: idOrSlug });

    if (!set) return res.status(404).json({ message: "Set not found" });

    await set.populate({
      path: "products.product",
      populate: { path: "category" },
    });

    res.json({ set: shapeSet(set) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function updateSet(req, res) {
  try {
    const { idOrSlug } = req.params;
    const set = isValidObjectId(idOrSlug)
      ? await Set.findById(idOrSlug)
      : await Set.findOne({ slug: idOrSlug });

    if (!set) return res.status(404).json({ message: "Set not found" });

    const { name, description, price, show } = req.body;

    if (name !== undefined) set.name = name;
    if (description !== undefined) set.description = description;
    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: "Price must be a valid number" });
      }
      set.price = parsedPrice;
    }
    if (show !== undefined) set.show = parseBoolean(show, set.show);

    if (req.body.products !== undefined) {
      const { products, createdProducts } = await resolveSetProducts(req.body.products);
      set.products = products;
      set.$locals = set.$locals || {};
      set.$locals.createdProducts = createdProducts;
    }

    const removeImageIds = parseIdList(req.body.removeImagePublicIds);
    if (removeImageIds.length) {
      await Promise.all(removeImageIds.map((id) => deleteFromCloudinary(id)));
      set.images = set.images.filter(
        (image) => !removeImageIds.includes(image.publicId)
      );
    }

    if (req.files?.length) {
      const newImages = await processImages(req.files);
      set.images.push(...newImages);
    }

    await set.save();
    const updated = await updateSetStock(set._id);
    await updated.populate({
      path: "products.product",
      populate: { path: "category" },
    });
    res.json({
      set: shapeSet(updated),
      createdProducts: set.$locals?.createdProducts || [],
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteSet(req, res) {
  try {
    const { idOrSlug } = req.params;
    const set = isValidObjectId(idOrSlug)
      ? await Set.findById(idOrSlug)
      : await Set.findOne({ slug: idOrSlug });

    if (!set) return res.status(404).json({ message: "Set not found" });

    await Promise.all(set.images.map((img) => deleteFromCloudinary(img.publicId)));
    await set.deleteOne();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function resolveSetProducts(value) {
  if (!value) return { products: [], createdProducts: [] };
  let payload = value;
  if (typeof value === "string") {
    try {
      payload = JSON.parse(value);
    } catch (error) {
      throw new Error("Invalid products payload");
    }
  }
  if (!Array.isArray(payload)) {
    throw new Error("Products payload must be an array");
  }

  const products = [];
  const createdProducts = [];

  for (const item of payload) {
    if (!item) continue;
    const quantity = Math.max(1, Number(item.quantity) || 1);

    if (item.productId) {
      const product = await Product.findById(item.productId);
      if (!product) throw new Error("Product not found: " + item.productId);
      products.push({ product: product._id, quantity });
      continue;
    }

    if (item.newProduct) {
      const { document, payload: shaped } = await createProductFromPayload(
        item.newProduct
      );
      products.push({ product: document._id, quantity });
      createdProducts.push(shapeProduct({ ...document.toObject(), ...shaped }));
      continue;
    }

    throw new Error("Each product must include productId or newProduct data");
  }

  return { products, createdProducts };
}

async function createProductFromPayload(data) {
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
    images,
    includeInCatalog = true,
    ...rest
  } = data || {};

  if (!name || price === undefined) {
    throw new Error("New product requires name and price");
  }
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    throw new Error("New product price must be a valid number");
  }

  let categoryDoc = null;
  if (category) {
    categoryDoc = await resolveCategoryRef(category);
  }

  const document = await Product.create({
    name,
    price: parsedPrice,
    description: description ?? "",
    careInstructions: careInstructions ?? "",
    details: normalizeArray(details),
      category: categoryDoc?._id ?? null,
    colors: normalizeArray(colors),
    sizes: normalizeArray(sizes),
    showColors: parseBoolean(showColors, true),
    showSizes: parseBoolean(showSizes, true),
    customAttribute: parseAttribute(customAttribute),
    inventory: parseInventory(inventory),
    listedInCatalog: parseBoolean(includeInCatalog, true),
    images: Array.isArray(images)
      ? images
      : [],
    isActive: parseBoolean(rest.isActive, true),
  });

  return {
    document,
    payload: {
      name,
      price: parsedPrice,
      description: description ?? "",
      careInstructions: careInstructions ?? "",
      details: normalizeArray(details),
     category: categoryDoc,
      colors: normalizeArray(colors),
      sizes: normalizeArray(sizes),
      showColors: parseBoolean(showColors, true),
      showSizes: parseBoolean(showSizes, true),
      customAttribute: parseAttribute(customAttribute),
      inventory: parseInventory(inventory),
      listedInCatalog: parseBoolean(includeInCatalog, true),
      images: document.images,
      isActive: parseBoolean(rest.isActive, true),
    },
  };
}

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

async function updateSetStock(setId) {
  const populated = await Set.findById(setId).populate("products.product");
  if (!populated) return null;

  let minStock = Infinity;
  populated.products.forEach((entry) => {
    const product = entry.product;
    if (!product) return;
    const available = computeAvailableStock(product);
    if (available === Infinity) return;
    const effective = Math.floor(available / Math.max(entry.quantity, 1));
    minStock = Math.min(minStock, effective);
  });

  populated.stock =
    minStock === Infinity ? Number.MAX_SAFE_INTEGER : Math.max(minStock, 0);
  await populated.save();
  return populated;
}

function shapeSet(doc) {
  if (!doc) return null;
  const id = doc._id?.toString?.() || String(doc._id);
  return {
    id,
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    price: doc.price,
    show: doc.show,
    stock: doc.stock,
    images: doc.images,
    products: (doc.products || []).map((entry) => ({
      quantity: entry.quantity,
      product: shapeProduct(entry.product) || entry.product,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function resolveCategoryRef(category) {
  if (!category) return null;
  const filter = isValidObjectId(category)
    ? { _id: category }
    : { slug: category };
  const doc = await Category.findOne(filter);
  if (!doc) throw new Error("Category not found");
  return doc;
}

function parseIdList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (_) {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}
