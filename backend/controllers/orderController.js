import mongoose from "mongoose";
import Order from "../models/Order.js";
import UserDetails from "../models/UserDetails.js";
import Product from "../models/Product.js";
import Set from "../models/Set.js";
import ShippingConfig from "../models/ShippingConfig.js";

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

// Basit şekillendirici
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
    })),
    address: doc.address,
    subtotal: doc.subtotal,
    shipping: doc.shipping,
    shippingName: doc.shippingName || "Standard Shipping",
    total: doc.total,
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
 *   items: [{ kind: "product"|"set", id: "<ObjectId>", qty: number }]
 * }
 * Not: Fiyat güvenliği için backend fiyatı DB'den çeker.
 */
export async function createOrder(req, res) {
  try {
    const userId = req.userId;
    const { addressId, items = [] } = req.body || {};

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
    const productIds = items
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

    const [products, sets] = await Promise.all([
      productIds.length ? Product.find({ _id: { $in: productIds } }) : [],
      setIds.length ? Set.find({ _id: { $in: setIds } }) : [],
    ]);

    const pMap = new Map(products.map((p) => [String(p._id), p]));
    const sMap = new Map(sets.map((s) => [String(s._id), s]));

    const orderItems = [];
    for (const raw of items) {
      const qty = Math.max(1, Number(raw.qty || 1));
      if (String(raw.kind) === "product") {
        const p = pMap.get(String(raw.id));
        if (!p)
          return res
            .status(404)
            .json({ message: "Product not found: " + raw.id });
        orderItems.push({
          kind: "product",
          ref: p._id,
          name: p.name,
          unitPrice: Number(p.price || 0),
          qty,
          image: p.images?.[0]?.url || "",
        });
      } else if (String(raw.kind) === "set") {
        const s = sMap.get(String(raw.id));
        if (!s)
          return res.status(404).json({ message: "Set not found: " + raw.id });
        orderItems.push({
          kind: "set",
          ref: s._id,
          name: s.name,
          unitPrice: Number(s.price || 0),
          qty,
          image: s.images?.[0]?.url || "",
        });
      } else {
        return res.status(400).json({ message: "Invalid item kind" });
      }
    }

    const subtotal = orderItems.reduce(
      (sum, i) => sum + i.unitPrice * i.qty,
      0
    );

    const shippingConfig = await ShippingConfig.getSingleton();
    const threshold = Number(shippingConfig.freeThreshold || 0);
    const feeRaw = Number(shippingConfig.fee || 0);
    const shipping = subtotal >= threshold ? 0 : Math.max(0, feeRaw);
    const shippingName = shippingConfig.name || "Standard Shipping";
    const total = subtotal + shipping;

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
    });

    res.status(201).json({ order: shapeOrder(order) });
  } catch (err) {
    res.status(500).json({ message: err.message || "Unable to create order" });
  }
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
    res.status(500).json({ message: err.message || "Unable to fetch order" });
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

    const {
      status,
      paymentMethod,
      paymentTxnId,
      markPaid,
    } = req.body || {};

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
    res.status(500).json({ message: error.message || "Unable to update order" });
  }
}
