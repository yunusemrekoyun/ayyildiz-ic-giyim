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

const PageSchema = new mongoose.Schema(
  {
    siteCode: {
      type: String,
      required: true,
      enum: SITE_CODES,
    },
    key: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    content: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    slug: { type: String, required: true, lowercase: true, trim: true },
    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

PageSchema.index(
  { siteCode: 1, key: 1 },
  { unique: true, name: "siteCode_key_unique" }
);
PageSchema.index({ siteCode: 1, slug: 1 }, { unique: true });

PageSchema.pre("validate", async function ensureSlug(next) {
  if (!this.isModified("title") && this.slug) {
    return next();
  }

  const baseSlug = slugify(this.title || "", {
    lower: true,
    strict: true,
    trim: true,
  });

  if (!baseSlug) {
    return next(new Error("Page title is required"));
  }

  let candidate = baseSlug;
  let counter = 1;
  while (
    await mongoose.models.Page.exists({
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

export default mongoose.model("Page", PageSchema);
