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
    show: { type: Boolean, default: true },
  },
  { _id: false }
);

const InventorySchema = new mongoose.Schema(
  {
    color: { type: String, default: null },
    size: { type: String, default: null },
    attributeValue: { type: String, default: null },
    stock: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    price: { type: Number, required: true, min: 0 },
    images: { type: [ImageSchema], default: [] },
    colors: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    showColors: { type: Boolean, default: true },
    showSizes: { type: Boolean, default: true },
    description: { type: String, default: "" },
    careInstructions: { type: String, default: "" },
    details: { type: [String], default: [] },
    customAttribute: { type: AttributeSchema, default: () => ({}) },
    inventory: { type: [InventorySchema], default: [] },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 1 }, { unique: true });
ProductSchema.index({ slug: 1 });
ProductSchema.index({ category: 1 });

ProductSchema.pre("validate", async function (next) {
  if (this.isModified("name") || !this.slug) {
    const baseSlug = slugify(this.name, { lower: true, strict: true });
    let slugCandidate = baseSlug;
    let counter = 1;
    while (
      await mongoose.models.Product.exists({
        slug: slugCandidate,
        _id: { $ne: this._id },
      })
    ) {
      slugCandidate = `${baseSlug}-${counter++}`;
    }
    this.slug = slugCandidate;
  }
  next();
});

export default mongoose.model("Product", ProductSchema);
