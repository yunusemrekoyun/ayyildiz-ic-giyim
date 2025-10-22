import Set from "../models/Set.js";
import { computeAvailableStock } from "./productHelpers.js";

function normalizeIds(values = []) {
  return Array.from(
    new Set(
      values
        .map((v) => {
          if (!v) return null;
          if (typeof v === "string") return v;
          if (typeof v === "object" && v._id) return v._id.toString();
          return String(v);
        })
        .filter(Boolean)
    )
  );
}

async function ensurePopulatedSet(setDoc) {
  if (!setDoc) return null;
  if (setDoc?.populated?.("products.product")) return setDoc;
  return setDoc.populate("products.product");
}

function computeStockFromProducts(setDoc) {
  let minStock = Infinity;
  (setDoc.products || []).forEach((entry) => {
    const product = entry.product;
    if (!product) return;
    const available = computeAvailableStock(product, { for: "set" });
    const usable = Number.isFinite(available)
      ? Math.max(0, Number(available))
      : 0;
    const perSet = Math.floor(
      usable / Math.max(1, Number(entry.quantity || 1))
    );
    minStock = Math.min(minStock, perSet);
  });

  if (minStock === Infinity) {
    return 0;
  }
  if (!Number.isFinite(minStock)) {
    return 0;
  }
  return Math.max(0, minStock);
}

export function computeSetStockSnapshot(setDoc) {
  if (!setDoc) return 0;
  return computeStockFromProducts(setDoc);
}

export async function recalculateSetStock(setDoc) {
  if (!setDoc) return null;
  const doc = await ensurePopulatedSet(setDoc);
  if (!doc) return null;
  const nextStock = computeStockFromProducts(doc);
  doc.stock = Math.max(0, Number.isFinite(nextStock) ? nextStock : 0);
  await doc.save();
  return doc;
}

export async function recalculateSetStockForSetIds(setIds = []) {
  const ids = normalizeIds(setIds);
  if (!ids.length) return [];
  const sets = await Set.find({ _id: { $in: ids } }).populate(
    "products.product"
  );
  const results = [];
  for (const setDoc of sets) {
    const updated = await recalculateSetStock(setDoc);
    if (updated) results.push(updated);
  }
  return results;
}

export async function recalculateSetStockForProductIds(productIds = []) {
  const ids = normalizeIds(productIds);
  if (!ids.length) return [];
  const sets = await Set.find({
    "products.product": { $in: ids },
  }).populate("products.product");
  const results = [];
  for (const setDoc of sets) {
    const updated = await recalculateSetStock(setDoc);
    if (updated) results.push(updated);
  }
  return results;
}
