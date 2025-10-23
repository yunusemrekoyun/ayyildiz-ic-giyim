// backend/models/PrivacyPolicy.js
import mongoose from "mongoose";

const SectionSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" },
    title: { type: String, default: "" },
    content: { type: [String], default: [] },
  },
  { _id: false }
);

const PrivacyPolicySchema = new mongoose.Schema(
  {
    singleton: { type: String, unique: true, default: "privacy_policy" },
    heroTitle: { type: String, default: "Privacy Policy" },
    heroIntro: { type: String, default: "" },
    sections: { type: [SectionSchema], default: [] },
    footerHtml: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      keywords: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

export default mongoose.model("PrivacyPolicy", PrivacyPolicySchema);
