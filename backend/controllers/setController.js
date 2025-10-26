// backend/controllers/setController.js
import Set from "../models/Set.js";
import Product from "../models/Product.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";
import { parseBoolean } from "../utils/productHelpers.js";
import { shapeProduct } from "../utils/productHelpers.js";
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

const isValidObjectId = (val) =>
  typeof val === "string" && val.match(/^[0-9a-fA-F]{24}$/);

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

async function shapeSetsWithDiscounts(sets) {
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
        if (entry?.product) nestedProducts.push(entry.product);
      });
    });

    if (nestedProducts.length) {
      productDiscountMap = computeProductDiscountMap(
        activeDiscounts,
        nestedProducts
      );
    }
  }

  return sets.map((set) => {
    const id = setId(set) || "";
    const discount = setDiscountMap.get(id) || null;
    return shapeSet(set, { discount, productDiscountMap });
  });
}

async function shapeSetWithDiscount(set) {
  if (!set) return null;
  const [shaped] = await shapeSetsWithDiscounts([set]);
  return shaped || null;
}

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

    const files = Array.isArray(req.files) ? req.files : [];
    const setImageFiles = files.filter((f) => f.fieldname === "images");

    const products = await resolveSetProducts(req.body.products);
    const images = await processImages(setImageFiles);

    let set = await Set.create({
      name,
      description,
      price: parsedPrice,
      show: parseBoolean(show, true),
      images,
      products,
    });

    set = await recalculateSetStock(set);
    await set.populate({
      path: "products.product",
      populate: { path: "category" },
    });
    res.status(201).json({ set: await shapeSetWithDiscount(set) });
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

    const hydrated = sets.map((set) => ({
      ...set,
      stock: computeSetStockSnapshot(set),
    }));

    res.json({ sets: await shapeSetsWithDiscounts(hydrated) });
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

    const refreshed = await recalculateSetStock(set);
    const workingSet = refreshed || set;

    await workingSet.populate({
      path: "products.product",
      populate: { path: "category" },
    });

    res.json({ set: await shapeSetWithDiscount(workingSet) });
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
      set.products = await resolveSetProducts(req.body.products);
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
    await set.populate({
      path: "products.product",
      populate: { path: "category" },
    });
    res.json({ set: await shapeSetWithDiscount(set) });
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

    await Promise.all(
      set.images.map((img) => deleteFromCloudinary(img.publicId))
    );
    await set.deleteOne();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function resolveSetProducts(value) {
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
    if (!item?.productId) {
      throw new Error("Each product must include productId");
    }
    const product = await Product.findById(item.productId);
    if (!product) throw new Error("Product not found: " + item.productId);
    const quantity = Math.max(1, Number(item.quantity) || 1);
    products.push({ product: product._id, quantity });
  }
  return products;
}

function shapeSet(
  doc,
  { discount = null, productDiscountMap = new Map() } = {}
) {
  if (!doc) return null;
  const id = doc._id?.toString?.() || String(doc._id);

  const normalizedDiscount = discount
    ? {
        id: discount.id || discount._id?.toString?.() || String(discount._id),
        name: discount.name,
        percentage: Number(discount.percentage) || 0,
        description: discount.description || "",
      }
    : null;

  const basePrice = Number(doc.price) || 0;
  const { finalPrice } = applyDiscount(basePrice, normalizedDiscount);

  return {
    id,
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    price: basePrice,
    finalPrice,
    discount: normalizedDiscount,
    hasDiscount: Boolean(normalizedDiscount) && basePrice !== finalPrice,
    show: doc.show,
    stock: doc.stock,
    images: doc.images,
    products: (doc.products || []).map((entry) => ({
      quantity: entry.quantity,
      product: entry.product
        ? shapeProduct(entry.product, {
            discount:
              productDiscountMap.get(
                entry.product?._id?.toString?.() ||
                  entry.product?.id?.toString?.() ||
                  ""
              ) || null,
            lang: req?.locale,
          })
        : entry.product,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
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
