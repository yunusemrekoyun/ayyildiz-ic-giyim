// backend/models/Set.js
import mongoose from "mongoose";
import slugify from "slugify";
import { SITE_CODES, DEFAULT_SITE_CODE } from "../constants/sites.js";

const SetImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: Number,
    height: Number,
    format: String,
  },
  { _id: false }
);

const SetProductSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "productModel",
    },
    productModel: {
      type: String,
      enum: ["Product", "ProductBase"],
      default: "Product",
    },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const SetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    images: { type: [SetImageSchema], default: [] },
    show: { type: Boolean, default: true },
    products: { type: [SetProductSchema], default: [] },
    stock: { type: Number, default: 0 },
    siteCode: {
      type: String,
      enum: SITE_CODES,
      default: DEFAULT_SITE_CODE,
      required: true,
      lowercase: true,
    },
  },
  { timestamps: true }
);

SetSchema.index({ siteCode: 1, name: 1 }, { unique: true });
SetSchema.index({ siteCode: 1, slug: 1 }, { unique: true });

SetSchema.pre("validate", async function (next) {
  if (!this.siteCode || !SITE_CODES.includes(this.siteCode)) {
    this.siteCode = DEFAULT_SITE_CODE;
  }
  if (this.isModified("name") || !this.slug) {
    const baseSlug =
      slugify(this.name, { lower: true, strict: true }) ||
      slugify(`${this.name || "set"}-${Date.now()}`, {
        lower: true,
        strict: true,
      });
    let slugCandidate = baseSlug;
    let counter = 1;
    while (
      await mongoose.models.Set.exists({
        slug: slugCandidate,
        siteCode: this.siteCode || DEFAULT_SITE_CODE,
        _id: { $ne: this._id },
      })
    ) {
      slugCandidate = `${baseSlug}-${counter++}`;
    }
    this.slug = slugCandidate;
  }
  next();
});

export default mongoose.model("Set", SetSchema);
