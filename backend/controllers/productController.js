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
} from "../utils/productHelpers.js";
import {
  fetchActiveDiscounts,
  computeProductDiscountMap,
} from "../utils/discountHelpers.js";

const isValidObjectId = (val) =>
  typeof val === "string" && val.match(/^[0-9a-fA-F]{24}$/);

const normalizeDetails = (value) => {
  const arr = normalizeArray(value);
  return arr.map((item) => String(item));
};

async function resolveCategory(category) {
  if (!category) return null;
  const filter = isValidObjectId(category)
    ? { _id: category }
    : { slug: category };
  const found = await Category.findOne(filter);
  if (!found) throw new Error("Category not found");
  return found;
}

function productId(doc) {
  if (!doc) return null;
  return (
    doc._id?.toString?.() ||
    doc.id?.toString?.() ||
    (typeof doc === "string" ? doc : String(doc._id || doc.id || ""))
  );
}

async function shapeProductsWithDiscounts(products) {
  if (!products?.length) return [];
  const activeDiscounts = await fetchActiveDiscounts();
  const discountMap = activeDiscounts.length
    ? computeProductDiscountMap(activeDiscounts, products)
    : new Map();

  return products.map((product) => {
    const id = productId(product);
    const discount = id ? discountMap.get(id) || null : null;
    return shapeProduct(product, { discount });
  });
}

async function shapeProductWithDiscount(product) {
  if (!product) return null;
  const [shaped] = await shapeProductsWithDiscounts([product]);
  return shaped || null;
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
      listedInCatalog: parseBoolean(req.body.listedInCatalog, true),
      images,
    });

    const populated = await product.populate("category");
    res.status(201).json({
      product: await shapeProductWithDiscount(populated),
    });
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
    const includeHidden = parseBoolean(req.query.includeHidden, false);

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (category) {
      const categoryDoc = await resolveCategory(category);
      const descendantIds = await collectDescendantIds(categoryDoc._id);
      filter.category = { $in: [categoryDoc._id, ...descendantIds] };
    }

    const mongoFilter = includeHidden ? filter : { ...filter, listedInCatalog: true };

    const [items, total] = await Promise.all([
      Product.find(mongoFilter)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate("category")
        .lean(),
      Product.countDocuments(mongoFilter),
    ]);

    res.json({
      products: await shapeProductsWithDiscounts(items),
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

    res.json({ product: await shapeProductWithDiscount(product) });
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
      listedInCatalog,
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
    if (listedInCatalog !== undefined)
      product.listedInCatalog = parseBoolean(
        listedInCatalog,
        product.listedInCatalog
      );

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
    res.json({ product: await shapeProductWithDiscount(populated) });
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
