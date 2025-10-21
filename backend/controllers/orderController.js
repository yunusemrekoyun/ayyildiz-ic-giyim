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
import { computeAvailableStock } from "../utils/productHelpers.js";

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
 *   couponCode?: string
 * }
 * Not: Fiyat güvenliği için backend fiyatı DB'den çeker.
 */
export async function createOrder(req, res) {
  try {
    const userId = req.userId;
    const { addressId, items = [], couponCode = null } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ message: "Invalid address id" });
    }

    // Adres snapshot'ı
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

    // Ürün/Setleri DB'den çekip güvenli fiyat hesapla
    const productLineIds = items
      .filter(
        (x) =>
          String(x.kind) === "product" && mongoose.Types.ObjectId.isValid(x.id)
      )
      .map((x) => x.id);

    const setIds = items
      .filter(
        (x) => String(x.kind) === "set" && mongoose.Types.ObjectId.isValid(x.id)
      )
      .map((x) => x.id);

    // Seçimlerde geçen tüm productId'ler (set için)
    const selectionProductIds = [];
    for (const it of items) {
      if (String(it.kind) === "set") {
        if (!Array.isArray(it.selections) || it.selections.length === 0) {
          return res
            .status(400)
            .json({ message: "Set selections are required" });
        }
        for (const s of it.selections) {
          if (!mongoose.Types.ObjectId.isValid(s.productId)) {
            return res
              .status(400)
              .json({ message: "Invalid selection productId" });
          }
          selectionProductIds.push(s.productId);
        }
      }
    }

    // Tek seferde tüm ihtiyaç duyulan ürünleri çek
    const allProductIds = Array.from(
      new Set([...productLineIds, ...selectionProductIds])
    );

    const [products, sets] = await Promise.all([
      allProductIds.length
        ? Product.find({ _id: { $in: allProductIds } }).populate("category")
        : [],
      setIds.length
        ? Set.find({ _id: { $in: setIds } }).populate("products.product")
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

    // 1) Önce fiyatlandırma snapshot'ı oluştur
    for (const raw of items) {
      const qty = Math.max(1, Number(raw.qty || 1));
      if (String(raw.kind) === "product") {
        const p = pMap.get(String(raw.id));
        if (!p)
          return res
            .status(404)
            .json({ message: "Product not found: " + raw.id });
        const discount = productDiscountMap.get(String(p._id)) || null;
        const { finalPrice } = applyDiscount(Number(p.price || 0), discount);
        const safePrice = roundCurrency(finalPrice);
        orderItems.push({
          kind: "product",
          ref: p._id,
          name: p.name,
          unitPrice: safePrice,
          qty,
          image: p.images?.[0]?.url || "",
          selections: [], // ürün satırında boş
        });
      } else if (String(raw.kind) === "set") {
        const s = sMap.get(String(raw.id));
        if (!s)
          return res.status(404).json({ message: "Set not found: " + raw.id });

        // selections doğrulama
        const selections = Array.isArray(raw.selections) ? raw.selections : [];
        if (selections.length === 0) {
          return res
            .status(400)
            .json({ message: "Set selections are required" });
        }

        const discount = setDiscountMap.get(String(s._id)) || null;
        const { finalPrice } = applyDiscount(Number(s.price || 0), discount);
        const safePrice = roundCurrency(finalPrice);

        orderItems.push({
          kind: "set",
          ref: s._id,
          name: s.name,
          unitPrice: safePrice,
          qty,
          image: s.images?.[0]?.url || "",
          selections: selections.map((sel) => ({
            productId: sel.productId,
            color: sel.color ?? null,
            size: sel.size ?? null,
            attribute: sel.attribute ?? null,
            qtyInSet: Math.max(1, Number(sel.qtyInSet || 1)),
          })),
        });
      } else {
        return res.status(400).json({ message: "Invalid item kind" });
      }
    }

    // 2) Stok yeterliliği kontrolü (set seçimleri için)
    // İhtiyaç tablosu: productId -> variant key -> required qty
    const needMap = new Map(); // productId -> Map(variantKey -> required)
    for (const it of orderItems) {
      if (it.kind !== "set") continue;
      const multiplier = Math.max(1, Number(it.qty || 1));
      for (const sel of it.selections) {
        const pid = String(sel.productId);
        if (!needMap.has(pid)) needMap.set(pid, new Map());
        const vkey = makeVariantKey(sel);
        const curr = needMap.get(pid).get(vkey) || 0;
        needMap.get(pid).set(vkey, curr + sel.qtyInSet * multiplier);
      }
    }

    // Çekilen ürünlerden stok doğrulaması
    for (const [pid, vmap] of needMap.entries()) {
      const prod = pMap.get(pid);
      if (!prod) {
        return res
          .status(400)
          .json({ message: "Selection product missing: " + pid });
      }
      const inv = Array.isArray(prod.inventory) ? prod.inventory : [];
      for (const [vkey, needed] of vmap.entries()) {
        const idx = inv.findIndex((row) => variantKeyOf(row) === vkey);
        const row = idx >= 0 ? inv[idx] : null;
        const available =
          typeof row?.stockSet === "number"
            ? row.stockSet
            : typeof row?.stock === "number"
            ? row.stock
            : 0;
        if (available < needed) {
          return res.status(400).json({
            message: "Insufficient stock for selection",
            productId: pid,
            needed,
            available,
          });
        }
      }
    }

    // 3) Stok düşümü (set selections -> stockSet öncelikli, yoksa legacy stock)
    const dirtyProducts = new Set();
    for (const [pid, vmap] of needMap.entries()) {
      const prod = pMap.get(pid);
      const inv = Array.isArray(prod.inventory) ? prod.inventory : [];
      let changed = false;
      for (const [vkey, needed] of vmap.entries()) {
        const idx = inv.findIndex((row) => variantKeyOf(row) === vkey);
        if (idx < 0) continue; // normalde olmamalı
        const row = inv[idx];

        if (typeof row.stockSet === "number") {
          row.stockSet = Math.max(0, Number(row.stockSet || 0) - needed);
        } else if (typeof row.stock === "number") {
          row.stock = Math.max(0, Number(row.stock || 0) - needed);
        } else {
          // güvenlik
          row.stockSet = 0;
        }
        inv[idx] = row;
        changed = true;
      }
      if (changed) {
        prod.markModified("inventory");
        dirtyProducts.add(pid);
      }
    }

    // 4) Ürünleri kaydet
    if (dirtyProducts.size) {
      await Promise.all(
        Array.from(dirtyProducts).map((pid) => pMap.get(pid).save())
      );
    }

    // 5) Etkilenen setlerin stoklarını yeniden hesapla
    const impactedSetIds = new Set(
      orderItems.filter((it) => it.kind === "set").map((it) => String(it.ref))
    );
    if (impactedSetIds.size) {
      const impactedSets = await Set.find({
        _id: { $in: Array.from(impactedSetIds) },
      }).populate("products.product");
      for (const s of impactedSets) {
        let minStock = Infinity;
        (s.products || []).forEach((entry) => {
          const product = entry.product;
          if (!product) return;
          const available = computeAvailableStock(product, { for: "set" });
          if (available === Infinity) return;
          const effective = Math.floor(
            Number(available) / Math.max(1, Number(entry.quantity || 1))
          );
          minStock = Math.min(minStock, effective);
        });
        s.stock =
          minStock === Infinity
            ? Number.MAX_SAFE_INTEGER
            : Math.max(0, Number(minStock) || 0);
        await s.save();
      }
    }

    // 6) Fiyat hesapları
    const subtotal = roundCurrency(
      orderItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
    );

    const shippingConfig = await ShippingConfig.getSingleton();
    const threshold = Number(shippingConfig.freeThreshold || 0);
    const feeRaw = Number(shippingConfig.fee || 0);
    const shipping = subtotal >= threshold ? 0 : Math.max(0, feeRaw);
    const shippingName = shippingConfig.name || "Standard Shipping";

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
          return res
            .status(400)
            .json({ message: "Coupon not found or inactive" });
        }

        if (subtotal < (coupon.minSubtotal || 0)) {
          return res.status(400).json({
            message: `Coupon requires minimum subtotal of ${coupon.minSubtotal}`,
            reason: "minSubtotal",
            minSubtotal: coupon.minSubtotal,
          });
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

    const orderNumber = await createOrderNumber();

    const order = await Order.create({
      orderNumber,
      user: userId,
      items: orderItems,
      address: addressSnap,
      subtotal,
      shipping,
      shippingName,
      total,
      status: "pending",
      payment: { method: "cod" },
      coupon: couponSummary,
    });

    res.status(201).json({ order: shapeOrder(order) });
  } catch (err) {
    res.status(500).json({ message: err.message || "Unable to create order" });
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
    }
    if (markPaidBool === false) {
      order.payment.paidAt = null;
    }

    await order.save();
    res.json({ order: shapeOrder(order) });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Unable to update order" });
  }
}
