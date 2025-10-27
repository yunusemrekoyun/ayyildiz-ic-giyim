import mongoose from "mongoose";
import slugify from "slugify";
import { SITE_CODES } from "../constants/sites.js";

const CategorySchema = new mongoose.Schema(
  {
    siteCode: {
      type: String,
      required: true,
      enum: SITE_CODES,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    ancestors: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
        },
      ],
      default: [],
    },
    order: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

CategorySchema.index({ siteCode: 1, slug: 1 }, { unique: true });
CategorySchema.index({ siteCode: 1 });
CategorySchema.index({ siteCode: 1, parentId: 1 });

CategorySchema.pre("validate", async function slugifyName(next) {
  if (!this.isModified("name") && this.slug) {
    return next();
  }

  const baseSlug = slugify(this.name || "", {
    lower: true,
    strict: true,
    trim: true,
  });
  if (!baseSlug) {
    return next(new Error("Category name is required"));
  }

  let slugCandidate = baseSlug;
  let counter = 1;

  while (
    await mongoose.models.Category.exists({
      siteCode: this.siteCode,
      slug: slugCandidate,
      _id: { $ne: this._id },
    })
  ) {
    counter += 1;
    slugCandidate = `${baseSlug}-${counter}`;
  }

  this.slug = slugCandidate;
  next();
});

export default mongoose.model("Category", CategorySchema);
