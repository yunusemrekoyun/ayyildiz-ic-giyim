// backend/controllers/setController.js
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
  shapeProduct,
  computeAvailableStock,
} from "../utils/productHelpers.js";
import {
  fetchActiveDiscounts,
  computeProductDiscountMap,
  mapDiscountsToSets,
  applyDiscount,
} from "../utils/discountHelpers.js";

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

// "setOnly" olan mevcut ürünleri katalogdan gizle
async function applyScopeVisibilityChanges(setProducts = []) {
  const hideIds = setProducts
    .filter((p) => p?.product && p.scope === "setOnly")
    .map((p) => p.product);
  if (hideIds.length) {
    await Product.updateMany(
      { _id: { $in: hideIds } },
      { $set: { listedInCatalog: false } }
    );
  }
}

// products[<index>].images  veya  products.<index>.images  -> index → File[] map
function groupProductFiles(files = []) {
  const map = new Map();
  for (const f of files || []) {
    const fn = String(f.fieldname || "");
    const m = fn.match(/products[\[\.\]](\d+)[\]\.]images/);
    if (m) {
      const idx = m[1];
      if (!map.has(idx)) map.set(idx, []);
      map.get(idx).push(f);
    }
  }
  return map;
}

// Cloudinary upload helper
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

    // ---- dosyaları ayrıştır
    const files = Array.isArray(req.files) ? req.files : [];
    const setImageFiles = files.filter((f) => f.fieldname === "images");

    const { products, createdProducts } = await resolveSetProducts(
      req.body.products,
      req.files // tüm dosyaları ver; ürün dosyalarını içeride gruplayacağız
    );

    // "setOnly" olan mevcut ürünleri katalogdan düş
    await applyScopeVisibilityChanges(products);

    // set'in kendi görsellerini yükle
    const images = await processImages(setImageFiles);

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
    res.status(201).json({
      set: await shapeSetWithDiscount(updated),
      createdProducts,
    });
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

    res.json({ sets: await shapeSetsWithDiscounts(sets) });
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

    res.json({ set: await shapeSetWithDiscount(set) });
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

    // ---- dosyaları ayrıştır
    const files = Array.isArray(req.files) ? req.files : [];
    const setImageFiles = files.filter((f) => f.fieldname === "images");

    if (req.body.products !== undefined) {
      const { products, createdProducts } = await resolveSetProducts(
        req.body.products,
        req.files
      );
      set.products = products;
      set.$locals = set.$locals || {};
      set.$locals.createdProducts = createdProducts;

      // scope değişikliklerini uygula
      await applyScopeVisibilityChanges(products);
    }

    // set görsel silme
    const removeImageIds = parseIdList(req.body.removeImagePublicIds);
    if (removeImageIds.length) {
      await Promise.all(removeImageIds.map((id) => deleteFromCloudinary(id)));
      set.images = set.images.filter(
        (image) => !removeImageIds.includes(image.publicId)
      );
    }

    // yeni set görselleri ekle
    if (setImageFiles.length) {
      const newImages = await processImages(setImageFiles);
      set.images.push(...newImages);
    }

    await set.save();
    const updated = await updateSetStock(set._id);
    await updated.populate({
      path: "products.product",
      populate: { path: "category" },
    });
    res.json({
      set: await shapeSetWithDiscount(updated),
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

    await Promise.all(
      set.images.map((img) => deleteFromCloudinary(img.publicId))
    );
    await set.deleteOne();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function resolveSetProducts(value, reqFiles = []) {
  if (!value) return { products: [], createdProducts: [] };

  // ürün indexine göre gönderilen dosyaları grupla
  const filesByProductIndex = groupProductFiles(reqFiles);

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

  for (let i = 0; i < payload.length; i++) {
    const item = payload[i];
    if (!item) continue;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const scope = item.scope === "setOnly" ? "setOnly" : "both";

    if (item.productId) {
      const product = await Product.findById(item.productId);
      if (!product) throw new Error("Product not found: " + item.productId);
      products.push({ product: product._id, quantity, scope });
      continue;
    }

    if (item.newProduct) {
      // bu index için yüklenen dosyalar
      const filesForThis = filesByProductIndex.get(String(i)) || [];
      const { document, payload: shaped } = await createProductFromPayload(
        item.newProduct,
        filesForThis
      );
      products.push({ product: document._id, quantity, scope });
      createdProducts.push(shapeProduct({ ...document.toObject(), ...shaped }));
      continue;
    }

    throw new Error("Each product must include productId or newProduct data");
  }

  return { products, createdProducts };
}

async function createProductFromPayload(data, files = []) {
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
    listedInCatalog = true,
    // images: dosyaları parametreden alıyoruz
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

  let uploadedImages = [];
  if (Array.isArray(files) && files.length) {
    uploadedImages = await processImages(files);
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
    listedInCatalog: parseBoolean(listedInCatalog, true),
    images: uploadedImages,
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
      listedInCatalog: parseBoolean(listedInCatalog, true),
      images: document.images,
      isActive: parseBoolean(rest.isActive, true),
    },
  };
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
      scope: entry.scope === "setOnly" ? "setOnly" : "both",
      product: entry.product
        ? shapeProduct(entry.product, {
            discount:
              productDiscountMap.get(
                entry.product?._id?.toString?.() ||
                  entry.product?.id?.toString?.() ||
                  ""
              ) || null,
          })
        : entry.product,
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

async function updateSetStock(setId) {
  const populated = await Set.findById(setId).populate("products.product");
  if (!populated) return null;

  let minStock = Infinity;
  populated.products.forEach((entry) => {
    const product = entry.product;
    if (!product) return;
    // Set stoğu SET havuzundan düşülür
    const available = computeAvailableStock(product, { for: "set" });
    if (available === Infinity) return;
    const effective = Math.floor(available / Math.max(entry.quantity, 1));
    minStock = Math.min(minStock, effective);
  });

  populated.stock =
    minStock === Infinity ? Number.MAX_SAFE_INTEGER : Math.max(minStock, 0);
  await populated.save();
  return populated;
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
