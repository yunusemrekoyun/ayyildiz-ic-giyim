import mongoose from "mongoose";
import slugify from "slugify";
import { SITE_CODES } from "../constants/sites.js";

const SeoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    keywords: { type: [String], default: [] },
  },
  { _id: false }
);

const ProductLocaleSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductBase",
      required: true,
      index: true,
    },
    siteCode: {
      type: String,
      required: true,
      enum: SITE_CODES,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    details: { type: [String], default: [] },
    careInstructions: { type: String, default: "", trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

ProductLocaleSchema.index(
  { productId: 1, siteCode: 1 },
  { unique: true, name: "productId_siteCode_unique" }
);
ProductLocaleSchema.index(
  { siteCode: 1, slug: 1 },
  { unique: true, name: "siteCode_slug_unique" }
);
ProductLocaleSchema.index({ siteCode: 1 });

ProductLocaleSchema.pre("validate", async function ensureSlug(next) {
  if (!this.isModified("name") && this.slug) {
    return next();
  }

  const baseSlug = slugify(this.name || "", {
    lower: true,
    strict: true,
    trim: true,
  });
  if (!baseSlug) {
    return next(new Error("Product name is required"));
  }

  let candidate = baseSlug;
  let counter = 1;
  while (
    await mongoose.models.ProductLocale.exists({
      siteCode: this.siteCode,
      slug: candidate,
      _id: { $ne: this._id },
    })
  ) {
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
  this.slug = candidate;
  next();
});

export default mongoose.model("ProductLocale", ProductLocaleSchema);
