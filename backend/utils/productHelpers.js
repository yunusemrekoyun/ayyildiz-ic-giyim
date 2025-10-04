import slugify from "slugify";

export function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => String(v).trim());
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed))
        return parsed.filter(Boolean).map((v) => String(v).trim());
    } catch (_) {}
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(lower)) return true;
    if (["false", "0", "no", "off"].includes(lower)) return false;
  }
  return fallback;
}

export function sanitizeOption(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

export function parseAttribute(value) {
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
}

export function parseInventory(value) {
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
}

export function ensureSlug(doc, sourceField = "name") {
  if (!doc[sourceField]) return;
  if (!doc.slug || doc.isModified?.(sourceField)) {
    const baseSlug = slugify(doc[sourceField], { lower: true, strict: true });
    doc.slug = baseSlug;
  }
}

export function shapeProduct(doc) {
  if (!doc) return null;
  return {
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
    listedInCatalog:
      doc.listedInCatalog !== undefined ? doc.listedInCatalog : true,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function computeAvailableStock(product) {
  if (!product) return 0;
  if (Array.isArray(product.inventory) && product.inventory.length) {
    return product.inventory.reduce(
      (sum, entry) => sum + (Number(entry?.stock) || 0),
      0
    );
  }
  if (product.inStock === false) return 0;
  return Number.isFinite(product.stock) ? Number(product.stock) : Infinity;
}
