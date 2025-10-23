// backend/models/FaqPageConfig.js
import mongoose from "mongoose";

const FaqItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { _id: true }
);

const FaqSectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "", trim: true }, // opsiyonel
    sortOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    items: { type: [FaqItemSchema], default: [] },
  },
  { _id: true }
);

const SeoSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    keywords: { type: [String], default: [] },
  },
  { _id: false }
);

// Tek belge konfig
const FaqPageConfigSchema = new mongoose.Schema(
  {
    heroTitle: {
      type: String,
      default: "Frequently Asked Questions",
      trim: true,
    },
    heroIntro: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true, index: true },

    // Bölümler
    sections: { type: [FaqSectionSchema], default: [] },

    // SEO
    seo: { type: SeoSchema, default: () => ({}) },

    // Audit
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// İsteğe bağlı indexler
FaqPageConfigSchema.index({ isActive: 1, updatedAt: -1 });

export default mongoose.model("FaqPageConfig", FaqPageConfigSchema);
