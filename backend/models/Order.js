import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["product", "set"], required: true }, // ürün mü set mi
    ref: { type: mongoose.Schema.Types.ObjectId, required: true }, // Product|Set _id
    name: { type: String, required: true }, // isim snapshot
    unitPrice: { type: Number, required: true }, // fiyat snapshot
    qty: { type: Number, min: 1, default: 1 },
    image: { type: String, default: "" }, // küçük görsel (opsiyonel)
  },
  { _id: false }
);

const AddressSnapshotSchema = new mongoose.Schema(
  {
    fullName: String,
    phone: String,
    country: String,
    city: String,
    district: String,
    postalCode: String,
    addressLine: String,
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },

    items: { type: [OrderItemSchema], default: [] },

    address: { type: AddressSnapshotSchema, required: true },

    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "completed", "cancelled"],
      default: "pending",
      index: true,
    },

    payment: {
      method: { type: String, default: "cod" }, // demo: kapıda ödeme
      txnId: { type: String, default: "" },
      paidAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);
