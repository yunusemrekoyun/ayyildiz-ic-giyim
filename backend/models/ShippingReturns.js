// backend/models/ShippingReturns.js
import mongoose from "mongoose";

const ListBlockSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "" },
    items: { type: [String], default: [] },
  },
  { _id: false }
);

const SectionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    paragraphs: { type: [String], default: [] }, // sıralı paragraflar
    list: { type: ListBlockSchema, default: () => ({}) }, // opsiyonel liste
  },
  { _id: false }
);

const SidebarContactSchema = new mongoose.Schema(
  {
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    hoursText: { type: String, default: "" }, // "Mon–Fri 09:00–17:00 CET" gibi
    note: { type: String, default: "" }, // kısa bilgilendirme kutusu metni
  },
  { _id: false }
);

const SeoSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    keywords: { type: [String], default: [] },
  },
  { _id: false }
);

const ShippingReturnsSchema = new mongoose.Schema(
  {
    // singleton kilidi
    singleton: {
      type: String,
      required: true,
      unique: true,
      default: "shipping_returns",
    },

    // hero
    heroTitle: { type: String, default: "Shipping & Returns" },
    heroIntro: { type: String, default: "" },

    // gövde
    sections: { type: [SectionSchema], default: [] },

    // sağ panel
    quickFacts: { type: [String], default: [] },
    sidebarContact: { type: SidebarContactSchema, default: () => ({}) },

    // durum/seo
    isActive: { type: Boolean, default: true, index: true },
    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model("ShippingReturns", ShippingReturnsSchema);
