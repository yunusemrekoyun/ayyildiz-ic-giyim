import mongoose from "mongoose";
import Order from "../models/Order.js";
import UserDetails from "../models/UserDetails.js";
import Product from "../models/Product.js";
import Set from "../models/Set.js";
import ShippingConfig from "../models/ShippingConfig.js";
import Coupon from "../models/Coupon.js";
import {
  fetchActiveDiscounts,
  computeProductDiscountMap,
  mapDiscountsToSets,
  applyDiscount,
} from "../utils/discountHelpers.js";
import {
  recalculateSetStockForSetIds,
  recalculateSetStockForProductIds,
} from "../utils/setStock.js";

function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(-4).toUpperCase();
  return `AYY-${y}${m}${d}-${rand}`;
}

async function createOrderNumber() {
  for (let i = 0; i < 6; i += 1) {
    const candidate = generateOrderNumber();
    const exists = await Order.exists({ orderNumber: candidate });
    if (!exists) return candidate;
  }
  throw new Error("Unable to generate unique order number");
}

function toBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

// normalize helpers
function normalize(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.toLowerCase() : null;
}

function shapeOrder(doc) {
  if (!doc) return null;
  const rawUser = doc.user;
  const populatedUser =
    rawUser && typeof rawUser === "object" && "_id" in rawUser ? rawUser : null;
  const userId = populatedUser
    ? populatedUser._id.toString()
    : rawUser?.toString?.() || rawUser;
  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber || doc._id.toString(),
    user: populatedUser
      ? {
          id: userId,
          firstName: populatedUser.firstName || "",
          lastName: populatedUser.lastName || "",
          email: populatedUser.email || "",
          phone: populatedUser.phone || "",
        }
      : userId,
    items: doc.items.map((i) => ({
      kind: i.kind,
      ref: i.ref?.toString?.() || i.ref,
      name: i.name,
      unitPrice: i.unitPrice,
      qty: i.qty,
      image: i.image || "",
      variant: i.variant
        ? {
            color: i.variant.color || null,
            size: i.variant.size || null,
            attribute: i.variant.attribute || null,
          }
        : null,
      selections:
        Array.isArray(i.selections) && i.selections.length
          ? i.selections.map((s) => ({
              productId: s.productId?.toString?.() || s.productId,
              color: s.color || null,
              size: s.size || null,
              attribute: s.attribute || null,
              qtyInSet: s.qtyInSet || 1,
            }))
          : [],
    })),
    address: doc.address,
    subtotal: doc.subtotal,
    shipping: doc.shipping,
    shippingName: doc.shippingName || "Standard Shipping",
    total: doc.total,
    coupon: doc.coupon?.code
      ? {
          code: doc.coupon.code,
          percentage: doc.coupon.percentage,
          discountAmount: doc.coupon.discountAmount,
          minSubtotal: doc.coupon.minSubtotal,
        }
      : null,
    status: doc.status,
    payment: doc.payment,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * POST /api/orders
 * Body: {
 *   addressId: string,
 *   items: [{
 *     kind: "product"|"set",
 *     id: "<ObjectId>",
 *     qty: number,
 *     // kind === 'set' için zorunlu:
 *     selections?: [{ productId, color, size, attribute, qtyInSet }]
 *   }],
 *   couponCode?: string,
 *   paymentSimulation?: "success"|"failure"
 * }
 * Not: Fiyat güvenliği için backend fiyatı DB'den çeker.
 */
export async function createOrder(req, res) {
  try {
    const userId = req.userId;
    const {
      addressId,
      items = [],
      couponCode = null,
      paymentSimulation = null,
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ message: "Invalid address id" });
    }

    const details = await UserDetails.findOne({ user: userId });
    const addr = details?.addresses?.id(addressId);
    if (!addr) return res.status(404).json({ message: "Address not found" });

    const addressSnap = {
      fullName: addr.fullName,
      phone: addr.phone,
      country: addr.country,
      city: addr.city,
      district: addr.district,
      postalCode: addr.postalCode,
      addressLine: addr.addressLine,
    };

    const productLineIds = items
      .filter(
        (x) =>
          String(x.kind) === 'product' && mongoose.Types.ObjectId.isValid(x.id)
      )
      .map((x) => x.id);

    const setIds = items
      .filter(
        (x) => String(x.kind) === 'set' && mongoose.Types.ObjectId.isValid(x.id)
      )
      .map((x) => x.id);

    const selectionProductIds = [];
    for (const it of items) {
      if (String(it.kind) === 'set') {
        if (!Array.isArray(it.selections) || it.selections.length === 0) {
          fail(400, 'Set selections are required');
        }
        for (const s of it.selections) {
          if (!mongoose.Types.ObjectId.isValid(s.productId)) {
            fail(400, 'Invalid selection productId');
          }
          selectionProductIds.push(s.productId);
        }
      }
    }

    const allProductIds = Array.from(
      new Set([...productLineIds, ...selectionProductIds])
    );

    const [products, sets] = await Promise.all([
      allProductIds.length
        ? Product.find({ _id: { $in: allProductIds } }).populate('category')
        : [],
      setIds.length
        ? Set.find({ _id: { $in: setIds } }).populate('products.product')
        : [],
    ]);

    const pMap = new Map(products.map((p) => [String(p._id), p]));
    const sMap = new Map(sets.map((s) => [String(s._id), s]));

    const activeDiscounts = await fetchActiveDiscounts();
    const productDiscountMap =
      activeDiscounts.length && products.length
        ? computeProductDiscountMap(activeDiscounts, products)
        : new Map();
    const setDiscountMap =
      activeDiscounts.length && sets.length
        ? mapDiscountsToSets(
            activeDiscounts,
            sets.map((set) => set._id)
          )
        : new Map();

    const orderItems = [];
    const catalogNeedMap = new Map();
    const setNeedMap = new Map();

    for (const raw of items) {
      const qty = Math.max(1, Number(raw.qty || 1));
      const rawKind = String(raw.kind || "product");

      if (rawKind === "product") {
        const p = await ensureProductLoaded(pMap, raw.id);
        if (!p)
          fail(404, "Product not found: " + raw.id, { productId: raw.id });

        const discount = productDiscountMap.get(String(p._id)) || null;
        const { finalPrice } = applyDiscount(Number(p.price || 0), discount);
        const safePrice = roundCurrency(finalPrice);

        const variantInfo = resolveCatalogVariant(p, raw);
        if (variantInfo.status === 'missing') {
          fail(400, 'Variant selection required for product', {
            productId: String(p._id),
          });
        }
        if (variantInfo.status === 'invalid') {
          fail(400, 'Variant not available for product', {
            productId: String(p._id),
            variant: variantInfo.variant,
          });
        }

        if (
          typeof variantInfo.index === 'number' &&
          variantInfo.index >= 0 &&
          variantInfo.key
        ) {
          const pid = String(p._id);
          if (!catalogNeedMap.has(pid)) catalogNeedMap.set(pid, new Map());
          const bucket = catalogNeedMap.get(pid);
          const entry = bucket.get(variantInfo.key) || {
            qty: 0,
            index: variantInfo.index,
            variant: variantInfo.variant,
          };
          entry.qty += qty;
          bucket.set(variantInfo.key, entry);
        }

        orderItems.push({
          kind: 'product',
          ref: p._id,
          name: p.name,
          unitPrice: safePrice,
          qty,
          image: p.images?.[0]?.url || '',
          selections: [],
          variant: variantInfo.variant,
        });
      } else if (rawKind === "set") {
        const s = sMap.get(String(raw.id));
        if (!s) fail(404, "Set not found: " + raw.id, { setId: raw.id });

        const rawSelections = Array.isArray(raw.selections)
          ? raw.selections
          : [];
        if (rawSelections.length === 0) {
          fail(400, "Set selections are required");
        }

        const discount = setDiscountMap.get(String(s._id)) || null;
        const { finalPrice } = applyDiscount(Number(s.price || 0), discount);
        const safePrice = roundCurrency(finalPrice);

        const normalizedSelections = rawSelections.map((sel) => ({
          productId: String(sel.productId),
          color: sel.color ?? null,
          size: sel.size ?? null,
          attribute: sel.attribute ?? null,
          qtyInSet: Math.max(1, Number(sel.qtyInSet || 1)),
        }));

        const multiplier = qty;
        for (const sel of normalizedSelections) {
          const pid = sel.productId;
          if (!setNeedMap.has(pid)) setNeedMap.set(pid, new Map());
          const vkey = makeVariantKey(sel);
          const current = setNeedMap.get(pid).get(vkey) || 0;
          setNeedMap
            .get(pid)
            .set(vkey, current + sel.qtyInSet * multiplier);
        }

        orderItems.push({
          kind: 'set',
          ref: s._id,
          name: s.name,
          unitPrice: safePrice,
          qty,
          image: s.images?.[0]?.url || '',
          selections: normalizedSelections,
        });
      } else {
        fail(400, 'Invalid item kind');
      }
    }

    for (const [pid, variants] of setNeedMap.entries()) {
      const prod = await ensureProductLoaded(pMap, pid);
      if (!prod) {
        fail(400, "Selection product missing: " + pid, { productId: pid });
      }
      const inv = Array.isArray(prod.inventory) ? prod.inventory : [];
      for (const [vkey, needed] of variants.entries()) {
        const idx = inv.findIndex((row) => variantKeyOf(row) === vkey);
        const row = idx >= 0 ? inv[idx] : null;
        const available = getInventoryStock(row, "set");
        if (available < needed) {
          fail(400, "Insufficient stock for selection", {
            productId: pid,
            variant: decodeVariantKey(vkey),
            needed,
            available,
          });
        }
      }
    }

    for (const [pid, variants] of catalogNeedMap.entries()) {
      const prod = await ensureProductLoaded(pMap, pid);
      if (!prod) {
        fail(400, "Product missing for catalog stock: " + pid, {
          productId: pid,
        });
      }
      const inv = Array.isArray(prod.inventory) ? prod.inventory : [];
      for (const [vkey, entry] of variants.entries()) {
        if (entry.index < 0) continue;
        const row =
          inv[entry.index] ||
          inv.find((candidate) => variantKeyOf(candidate) === vkey);
        if (!row) {
          fail(400, "Variant not found for product", {
            productId: pid,
            variant: decodeVariantKey(vkey),
          });
        }
        const available = getInventoryStock(row, "catalog");
        if (available < entry.qty) {
          fail(400, "Insufficient stock for product", {
            productId: pid,
            variant: decodeVariantKey(vkey),
            needed: entry.qty,
            available,
          });
        }
      }
    }

    const subtotal = roundCurrency(
      orderItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
    );

    const shippingConfig = await ShippingConfig.getSingleton();
    const threshold = Number(shippingConfig.freeThreshold || 0);
    const feeRaw = Number(shippingConfig.fee || 0);
    const shipping = subtotal >= threshold ? 0 : Math.max(0, feeRaw);
    const shippingName = shippingConfig.name || 'Standard Shipping';

    let couponSummary = null;
    let couponDiscountAmount = 0;
    if (couponCode) {
      const normalized = normalizeCode(couponCode);
      if (normalized) {
        const now = new Date();
        const coupon = await Coupon.findOne({
          code: normalized,
          active: true,
          $and: [
            { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
            { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
          ],
        }).lean();

        if (!coupon) {
          fail(400, 'Coupon not found or inactive', { code: normalized });
        }

        if (subtotal < (coupon.minSubtotal || 0)) {
          fail(
            400,
            `Coupon requires minimum subtotal of ${coupon.minSubtotal}`,
            {
              reason: 'minSubtotal',
              minSubtotal: coupon.minSubtotal,
            }
          );
        }

        couponDiscountAmount = roundCurrency(
          (subtotal * Number(coupon.percentage || 0)) / 100
        );
        couponSummary = {
          code: coupon.code,
          percentage: coupon.percentage,
          minSubtotal: coupon.minSubtotal || 0,
          discountAmount: couponDiscountAmount,
        };
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - couponDiscountAmount);
    const total = roundCurrency(discountedSubtotal + shipping);

    const simulation = normalizeSimulation(paymentSimulation);
    if (simulation === 'failure') {
      fail(402, 'Payment simulation failed');
    }

    const orderNumber = await createOrderNumber();

    const dirtyProductIds = [];
    for (const [pid, variants] of catalogNeedMap.entries()) {
      if (!variants.size) continue;
      const product = await ensureProductLoaded(pMap, pid);
      if (!product) continue;
      const inv = Array.isArray(product.inventory) ? product.inventory : [];
      let changed = false;
      for (const [vkey, entry] of variants.entries()) {
        if (entry.index < 0) continue;
        if (!inv[entry.index]) continue;
        const row = inv[entry.index];
        const available = getInventoryStock(row, "catalog");
        const next = Math.max(0, available - entry.qty);
        inv[entry.index] = setInventoryStock(row, "catalog", next);
        changed = true;
      }
      if (changed) {
        product.markModified('inventory');
        if (!dirtyProductIds.includes(pid)) dirtyProductIds.push(pid);
      }
    }

    for (const [pid, variants] of setNeedMap.entries()) {
      if (!variants.size) continue;
      const product = await ensureProductLoaded(pMap, pid);
      if (!product) continue;
      const inv = Array.isArray(product.inventory) ? product.inventory : [];
      let changed = false;
      for (const [vkey, needed] of variants.entries()) {
        const idx = inv.findIndex((row) => variantKeyOf(row) === vkey);
        if (idx < 0) continue;
        const row = inv[idx];
        const available = getInventoryStock(row, "set");
        const next = Math.max(0, available - needed);
        inv[idx] = setInventoryStock(row, "set", next);
        changed = true;
      }
      if (changed) {
        product.markModified('inventory');
        if (!dirtyProductIds.includes(pid)) dirtyProductIds.push(pid);
      }
    }

    if (dirtyProductIds.length) {
      await Promise.all(dirtyProductIds.map((pid) => pMap.get(pid)?.save()));
      await recalculateSetStockForProductIds(dirtyProductIds);
    }

    const impactedSetIds = new Set(
      orderItems.filter((it) => it.kind === 'set').map((it) => String(it.ref))
    );
    if (impactedSetIds.size) {
      await recalculateSetStockForSetIds(Array.from(impactedSetIds));
    }

    const paymentPayload =
      simulation === "success"
        ? {
            method: "simulated",
            status: "success",
            simulation: "success",
            paidAt: new Date(),
          }
        : {
            method: "cod",
            status: "pending",
            simulation,
          };

    const order = await Order.create({
      orderNumber,
      user: userId,
      items: orderItems,
      address: addressSnap,
      subtotal,
      shipping,
      shippingName,
      total,
      status: simulation === 'success' ? 'paid' : 'pending',
      payment: paymentPayload,
      coupon: couponSummary,
    });

    res.status(201).json({ order: shapeOrder(order) });
  } catch (err) {
    if (err.status) {
      const payload = { message: err.message || 'Request failed' };
      if (err.extra) payload.details = err.extra;
      return res.status(err.status).json(payload);
    }
    res.status(500).json({ message: err.message || 'Unable to create order' });
  }
}

function normalizeCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function makeVariantKey(sel) {
  return [
    normalize(sel.color) || "",
    normalize(sel.size) || "",
    normalize(sel.attribute) || "",
  ].join("||");
}

function variantKeyOf(row) {
  return [
    normalize(row?.color) || "",
    normalize(row?.size) || "",
    normalize(row?.attributeValue) || "",
  ].join("||");
}

function fail(status, message, extra = null) {
  const error = new Error(message);
  error.status = status;
  if (extra && Object.keys(extra || {}).length) {
    error.extra = extra;
  }
  throw error;
}

function sanitizeVariantValue(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function normalizeVariantInput(raw) {
  const variant =
    raw?.variant && typeof raw.variant === "object" ? raw.variant : {};
  return {
    color: sanitizeVariantValue(
      variant.color ??
        variant.colour ??
        raw.color ??
        raw.colour ??
        variant.selectedColor ??
        null
    ),
    size: sanitizeVariantValue(variant.size ?? raw.size ?? null),
    attribute: sanitizeVariantValue(
      variant.attribute ??
        variant.attributeValue ??
        raw.attribute ??
        raw.attributeValue ??
        null
    ),
  };
}

function resolveCatalogVariant(product, rawItem) {
  const inventory = Array.isArray(product?.inventory)
    ? product.inventory
    : [];
  const normalized = normalizeVariantInput(rawItem);
  const hasSelection =
    normalized.color !== null ||
    normalized.size !== null ||
    normalized.attribute !== null;

  if (!inventory.length) {
    return {
      status: "ok",
      variant: normalized,
      index: -1,
      key: hasSelection ? makeVariantKey(normalized) : null,
    };
  }

  const candidateKey = makeVariantKey(normalized);

  if (hasSelection) {
    const idx = inventory.findIndex((row) => variantKeyOf(row) === candidateKey);
    if (idx < 0) {
      return {
        status: "invalid",
        variant: normalized,
        index: -1,
        key: candidateKey,
      };
    }
    const row = inventory[idx];
    return {
      status: "ok",
      variant: {
        color: row?.color ?? normalized.color ?? null,
        size: row?.size ?? normalized.size ?? null,
        attribute: row?.attributeValue ?? normalized.attribute ?? null,
      },
      index: idx,
      key: candidateKey,
    };
  }

  if (inventory.length === 1) {
    const row = inventory[0];
    const variant = {
      color: row?.color ?? null,
      size: row?.size ?? null,
      attribute: row?.attributeValue ?? null,
    };
    return {
      status: "ok",
      variant,
      index: 0,
      key: makeVariantKey(variant),
    };
  }

  const uniqueKeys = Array.from(
    new Set(inventory.map((row) => variantKeyOf(row)))
  ).filter(Boolean);

  if (uniqueKeys.length === 1) {
    const key = uniqueKeys[0];
    const idx = inventory.findIndex((row) => variantKeyOf(row) === key);
    const row = inventory[idx];
    const variant = {
      color: row?.color ?? null,
      size: row?.size ?? null,
      attribute: row?.attributeValue ?? null,
    };
    return { status: "ok", variant, index: idx, key };
  }

  return {
    status: "missing",
    variant: normalized,
    index: -1,
    key: candidateKey,
  };
}

function getInventoryStock(row, pool = "catalog") {
  if (!row) return 0;
  if (pool === "set") {
    if (typeof row?.stockSet === "number") return Number(row.stockSet) || 0;
  } else {
    if (typeof row?.stockCatalog === "number")
      return Number(row.stockCatalog) || 0;
  }
  if (typeof row?.stock === "number") return Number(row.stock) || 0;
  return 0;
}

function setInventoryStock(row, pool = "catalog", value = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return row;
  }
  const safe = Number.isFinite(numeric)
    ? Math.max(0, Math.floor(numeric))
    : 0;
  row.stockCatalog = safe;
  row.stockSet = safe;
  row.stock = safe;
  return row;
}

function decodeVariantKey(key) {
  const [color = "", size = "", attribute = ""] = String(key || "")
    .split("||")
    .map((part) => part || "");
  return {
    color: color || null,
    size: size || null,
    attribute: attribute || null,
  };
}

function normalizeSimulation(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  if (["success", "ok", "paid", "true", "yes"].includes(normalized))
    return "success";
  if (["failure", "fail", "failed", "error", "false", "no"].includes(normalized))
    return "failure";
  return null;
}

async function ensureProductLoaded(map, id) {
  const key = String(id || "").trim();
  if (!key) return null;
  if (map.has(key)) return map.get(key);

  let product = null;
  if (mongoose.Types.ObjectId.isValid(key)) {
    product = await Product.findById(key).populate("category");
  }
  if (!product) {
    product = await Product.findOne({ slug: key }).populate("category");
  }
  if (product) {
    const normalizedKey = String(product._id);
    map.set(normalizedKey, product);
    if (normalizedKey !== key) {
      map.set(key, product);
    }
  }
  return product;
}


/** GET /api/orders/mine  */
export async function myOrders(req, res) {
  try {
    const list = await Order.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ orders: list.map(shapeOrder) });
  } catch (err) {
    res.status(500).json({ message: err.message || "Unable to fetch orders" });
  }
}

/** GET /api/orders/:id */
export async function getOrder(req, res) {
  try {
    const o = await Order.findOne({ _id: req.params.id, user: req.userId });
    if (!o) return res.status(404).json({ message: "Order not found" });
    res.json({ order: shapeOrder(o) });
  } catch (err) {
    res.status(500).json({ message: err.message || "Unable to fetch orders" });
  }
}

/** Admin: GET /api/orders */
export async function listOrders(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      filter.status = String(req.query.status).toLowerCase();
    }
    if (req.query.user && mongoose.Types.ObjectId.isValid(req.query.user)) {
      filter.user = req.query.user;
    }
    if (req.query.q) {
      const q = String(req.query.q).trim();
      if (q) {
        const sanitized = q.replace(/[^a-zA-Z0-9]/g, "");
        const pattern = sanitized.split("").join("[-\\s]*");
        filter.orderNumber = {
          $regex: pattern || q,
          $options: "i",
        };
      }
    }

    const [items, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .populate("user", "firstName lastName email phone")
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders: items.map(shapeOrder),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to list orders" });
  }
}

function isObjectIdLike(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

async function findOrderByIdOrNumber(idOrNumber) {
  if (isObjectIdLike(idOrNumber)) {
    const byId = await Order.findById(idOrNumber);
    if (byId) return byId;
  }
  return Order.findOne({ orderNumber: idOrNumber });
}

/** Admin: GET /api/orders/:id */
export async function adminGetOrder(req, res) {
  try {
    let order = null;
    if (isObjectIdLike(req.params.id)) {
      order = await Order.findById(req.params.id).populate(
        "user",
        "firstName lastName email phone"
      );
    }
    if (!order) {
      order = await Order.findOne({
        orderNumber: req.params.id,
      }).populate("user", "firstName lastName email phone");
    }
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order: shapeOrder(order) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to fetch order" });
  }
}

/** Admin: PATCH /api/orders/:id/status */
export async function updateOrderStatus(req, res) {
  try {
    const order = await findOrderByIdOrNumber(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const { status, paymentMethod, paymentTxnId, markPaid } = req.body || {};

    if (status !== undefined) {
      const allowed = ["pending", "paid", "shipped", "completed", "cancelled"];
      const nextStatus = String(status).toLowerCase();
      if (!allowed.includes(nextStatus)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      order.status = nextStatus;
    }

    if (paymentMethod !== undefined) {
      order.payment.method = String(paymentMethod) || "cod";
    }

    if (paymentTxnId !== undefined) {
      order.payment.txnId = String(paymentTxnId);
    }

    const markPaidBool = toBoolean(markPaid);

    if (markPaidBool === true || status === "paid") {
      order.payment.paidAt = order.payment.paidAt || new Date();
      order.payment.status = "success";
    }
    if (markPaidBool === false) {
      order.payment.paidAt = null;
      order.payment.status = "pending";
    }

    await order.save();
    res.json({ order: shapeOrder(order) });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Unable to update order" });
  }
}
