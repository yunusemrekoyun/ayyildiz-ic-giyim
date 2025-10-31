// backend/controllers/setController.js
import Set from "../models/Set.js";
import Product from "../models/Product.js";
import { hydrateProductsWithInventory } from "../utils/stockItemHelpers.js";

const isId = (s) => typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);

function parseBool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
}

async function uploadImages(files = []) {
  return files.map((f) => ({
    url: f.path || f.location || "",
    publicId: f.filename || f.originalname || "",
    width: undefined,
    height: undefined,
    format: undefined,
  }));
}

async function parseSetProducts(value) {
  if (!value) return [];
  const payload = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(payload)) throw new Error("products must be an array");
  const out = [];
  for (const row of payload) {
    if (!row?.productId) throw new Error("Each item must include productId");
    const prod = await Product.findById(row.productId);
    if (!prod) throw new Error("Product not found: " + row.productId);
    out.push({
      product: prod._id,
      quantity: Math.max(1, Number(row.quantity) || 1),
    });
  }
  return out;
}

export async function createSet(req, res) {
  try {
    const {
      name,
      description = "",
      price,
      show = true,
      products = [],
      sku,
    } = req.body;
    if (!name || price == null)
      return res.status(400).json({ message: "Name and price are required" });
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0)
      return res.status(400).json({ message: "Price must be a valid number" });

    const files = Array.isArray(req.files) ? req.files : [];
    const images = await uploadImages(
      files.filter((f) => f.fieldname === "images")
    );
    const setProducts = await parseSetProducts(products);

    const doc = await Set.create({
      name: String(name).trim(),
      description,
      price: priceNum,
      show: !!JSON.parse(String(show).toLowerCase() || "true"),
      images,
      products: setProducts,
      sku: sku ? String(sku).trim().toUpperCase() : undefined,
    });

    await doc.populate({ path: "products.product" });
    const componentProducts = doc.products
      .map((entry) => entry?.product)
      .filter(Boolean);
    await hydrateProductsWithInventory(componentProducts);
    doc.set("stock", null, { strict: false });
    res.status(201).json({ set: doc });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.sku)
      return res.status(400).json({ message: "SKU already exists" });
    res.status(400).json({ message: err.message || "Create failed" });
  }
}

export async function listSets(req, res) {
  try {
    const search = String(req.query.search || "").trim();
    const includeHidden = parseBool(req.query.includeHidden, false);
    const limit = Math.min(
      500,
      Math.max(1, Number(req.query.limit || (search ? 60 : 200)))
    );

    const filter = {};
    if (!includeHidden) filter.show = true;
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const sets = await Set.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({ path: "products.product" })
      .lean();

    const products = [];
    sets.forEach((set) => {
      (set.products || []).forEach((entry) => {
        if (entry?.product) products.push(entry.product);
      });
      set.stock = null;
    });
    await hydrateProductsWithInventory(products);
    res.json({ sets });
  } catch (err) {
    res.status(500).json({ message: err.message || "List failed" });
  }
}

export async function getSet(req, res) {
  try {
    const { idOrSlug } = req.params;
    const set = isId(idOrSlug)
      ? await Set.findById(idOrSlug)
      : await Set.findOne({ slug: idOrSlug });
    if (!set) return res.status(404).json({ message: "Set not found" });
    await set.populate({ path: "products.product" });
    const componentProducts = set.products
      .map((entry) => entry?.product)
      .filter(Boolean);
    await hydrateProductsWithInventory(componentProducts);
    set.set("stock", null, { strict: false });
    res.json({ set });
  } catch (err) {
    res.status(500).json({ message: err.message || "Get failed" });
  }
}

export async function updateSet(req, res) {
  try {
    const { idOrSlug } = req.params;
    const set = isId(idOrSlug)
      ? await Set.findById(idOrSlug)
      : await Set.findOne({ slug: idOrSlug });
    if (!set) return res.status(404).json({ message: "Set not found" });

    const {
      name,
      description,
      price,
      show,
      products,
      sku,
      removeImagePublicIds,
    } = req.body;

    if (name !== undefined) set.name = String(name).trim();
    if (description !== undefined) set.description = description;
    if (price !== undefined) {
      const n = Number(price);
      if (!Number.isFinite(n) || n < 0)
        return res
          .status(400)
          .json({ message: "Price must be a valid number" });
      set.price = n;
    }
    if (show !== undefined)
      set.show = !!JSON.parse(String(show).toLowerCase() || "true");
    if (sku !== undefined)
      set.sku = sku ? String(sku).trim().toUpperCase() : undefined;

    if (products !== undefined) set.products = await parseSetProducts(products);

    if (removeImagePublicIds) {
      const ids = Array.isArray(removeImagePublicIds)
        ? removeImagePublicIds
        : String(removeImagePublicIds)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      set.images = set.images.filter((img) => !ids.includes(img.publicId));
      // storage temizliği burada yapılabilir
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const newImgs = await uploadImages(
      files.filter((f) => f.fieldname === "images")
    );
    if (newImgs.length) set.images.push(...newImgs);

    await set.save();
    await set.populate({ path: "products.product" });
    const componentProducts = set.products
      .map((entry) => entry?.product)
      .filter(Boolean);
    await hydrateProductsWithInventory(componentProducts);
    set.set("stock", null, { strict: false });
    res.json({ set });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.sku)
      return res.status(400).json({ message: "SKU already exists" });
    res.status(400).json({ message: err.message || "Update failed" });
  }
}

export async function deleteSet(req, res) {
  try {
    const { idOrSlug } = req.params;
    const set = isId(idOrSlug)
      ? await Set.findById(idOrSlug)
      : await Set.findOne({ slug: idOrSlug });
    if (!set) return res.status(404).json({ message: "Set not found" });
    // set.images storage silme vs.
    await set.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message || "Delete failed" });
  }
}
