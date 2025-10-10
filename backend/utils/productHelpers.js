import slugify from "slugify";

export function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value))
    return value.filter(Boolean).map((v) => String(v).trim());
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
    } catch {
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
  return { title, values, show: parseBoolean(payload.show, true) };
}

/**
 * Envanter parser:
 * - stockCatalog & stockSet: yeni ikili havuz
 * - legacy "stock" verilirse stockCatalog olarak kabul edilir (set havuzu 0)
 * - aynı varyant anahtarını (color|size|attribute) tekilleştirir
 */
export function parseInventory(value) {
  if (!value) return [];
  let payload = value;
  if (typeof value === "string") {
    try {
      payload = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(payload)) return [];

  const toSafeInt = (n, fallback = 0) => {
    const x = Number(n);
    return Number.isFinite(x) && x >= 0 ? Math.floor(x) : fallback;
  };

  const map = new Map();
  for (const item of payload) {
    if (!item) continue;
    const color = sanitizeOption(item.color);
    const size = sanitizeOption(item.size);
    const attributeValue = sanitizeOption(item.attributeValue);

    const legacy = toSafeInt(item.stock, undefined); // undefined => yok
    const stockCatalog = toSafeInt(
      item.stockCatalog,
      legacy !== undefined ? legacy : 0
    );
    const stockSet = toSafeInt(item.stockSet, 0);

    const key = [color || "", size || "", attributeValue || ""].join("||");
    map.set(key, {
      color: color ?? null,
      size: size ?? null,
      attributeValue: attributeValue ?? null,
      // legacy uyum: "stock" alanını da döndürelim, katalog havuzunu yansıtsın
      stock: stockCatalog,
      stockCatalog,
      stockSet,
    });
  }

  return Array.from(map.values());
}

export function ensureSlug(doc, sourceField = "name") {
  if (!doc[sourceField]) return;
  if (!doc.slug || doc.isModified?.(sourceField)) {
    const baseSlug = slugify(doc[sourceField], { lower: true, strict: true });
    doc.slug = baseSlug;
  }
}

export function shapeProduct(
  doc,
  { discount = null, finalPrice = undefined } = {}
) {
  if (!doc) return null;

  const id =
    doc._id?.toString?.() || doc.id?.toString?.() || String(doc._id || doc.id);
  const basePrice = Number(doc.price) || 0;

  const normalizedDiscount = discount
    ? {
        id: discount.id || discount._id?.toString?.() || String(discount._id),
        name: discount.name,
        percentage: Number(discount.percentage) || 0,
        description: discount.description || "",
      }
    : null;

  let computedFinal = finalPrice;
  if (!Number.isFinite(computedFinal)) {
    computedFinal = normalizedDiscount
      ? Math.round(
          (basePrice - (basePrice * normalizedDiscount.percentage) / 100) * 100
        ) / 100
      : basePrice;
  }

  // inventory’yi üç alanla yansıt (legacy "stock" = stockCatalog)
  const inventory = Array.isArray(doc.inventory)
    ? doc.inventory.map((row) => {
        const stockCatalog =
          typeof row.stockCatalog === "number"
            ? row.stockCatalog
            : typeof row.stock === "number" // legacy
            ? row.stock
            : 0;
        const stockSet = typeof row.stockSet === "number" ? row.stockSet : 0;
        return {
          color: row?.color ?? null,
          size: row?.size ?? null,
          attributeValue: row?.attributeValue ?? null,
          stock: stockCatalog, // legacy alanı doldurmaya devam
          stockCatalog,
          stockSet,
        };
      })
    : [];

  return {
    id,
    name: doc.name,
    slug: doc.slug,
    price: basePrice,
    finalPrice: Math.max(0, Number(computedFinal) || 0),
    discount: normalizedDiscount,
    hasDiscount: Boolean(normalizedDiscount) && basePrice !== computedFinal,
    images: doc.images,
    colors: doc.colors,
    sizes: doc.sizes,
    showColors: doc.showColors !== undefined ? doc.showColors : true,
    showSizes: doc.showSizes !== undefined ? doc.showSizes : true,
    customAttribute: doc.customAttribute
      ? {
          title: doc.customAttribute.title || "",
          values: doc.customAttribute.values || [],
          show: !!doc.customAttribute.show,
        }
      : { title: "", values: [], show: false },
    inventory,
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

/**
 * pool = "catalog" | "set"
 * Stok tanımsızsa (envanter yoksa) Infinity döner (set stok hesabı için)
 */
export function computeAvailableStock(product, context = { for: "catalog" }) {
  const pool = context?.for === "set" ? "stockSet" : "stockCatalog";
  const inv = Array.isArray(product?.inventory) ? product.inventory : [];
  if (inv.length === 0) return Infinity;

  let total = 0;
  for (const row of inv) {
    const val =
      typeof row[pool] === "number"
        ? row[pool]
        : typeof row.stock === "number" // legacy: catalog say
        ? context?.for === "set"
          ? 0
          : row.stock
        : 0;
    total += Math.max(0, Math.floor(val));
  }
  return total;
}
