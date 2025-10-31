// backend/models/Product.js
import mongoose from "mongoose";
import slugify from "slugify";

const ImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: Number,
    height: Number,
    format: String,
  },
  { _id: false }
);

const AttributeSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    values: { type: [String], default: [] },
    show: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true },

    // opsiyonel ürün SKU
    sku: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },

    price: { type: Number, required: true, min: 0 },
    images: { type: [ImageSchema], default: [] },

    colors: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    showColors: { type: Boolean, default: true },
    showSizes: { type: Boolean, default: true },
    customAttribute: { type: AttributeSchema, default: () => ({}) },

    description: { type: String, default: "" },
    careInstructions: { type: String, default: "" },
    details: { type: [String], default: [] },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    isActive: { type: Boolean, default: true },
    listedInCatalog: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 1 }, { unique: true });
ProductSchema.index({ slug: 1 });
ProductSchema.index({ sku: 1 }, { unique: true, sparse: true });
ProductSchema.index({ category: 1 });

ProductSchema.pre("validate", async function (next) {
  if (this.isModified("name") || !this.slug) {
    const base =
      slugify(this.name || "", { lower: true, strict: true }) || "urun";
    let s = base;
    let k = 1;
    while (
      await mongoose.models.Product.exists({ slug: s, _id: { $ne: this._id } })
    ) {
      s = `${base}-${k++}`;
    }
    this.slug = s;
  }
  next();
});

export default mongoose.model("Product", ProductSchema);
