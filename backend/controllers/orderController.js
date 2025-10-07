import mongoose from "mongoose";
import Order from "../models/Order.js";
import UserDetails from "../models/UserDetails.js";
import Product from "../models/Product.js";
import Set from "../models/Set.js";

// Basit şekillendirici
function shapeOrder(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    user: doc.user?.toString?.() || doc.user,
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
    const shipping = 0; // basit kural: ücretsiz
    const total = subtotal + shipping;

    const order = await Order.create({
      user: userId,
      items: orderItems,
      address: addressSnap,
      subtotal,
      shipping,
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
