// backend/models/Terms.js
import mongoose from "mongoose";

const SectionSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  paragraphs: { type: [String], default: [] },
});

const TermsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "terms", unique: true, index: true },
    heroTitle: { type: String, default: "Terms of Service" },
    heroIntro: { type: String, default: "" },
    sections: { type: [SectionSchema], default: [] },
    footerNote: { type: String, default: "" }, // ← ÖNEMLİ
    isActive: { type: Boolean, default: true },
    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      keywords: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Terms", TermsSchema);
