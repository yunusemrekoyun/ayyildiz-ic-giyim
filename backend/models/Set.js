// backend/models/Set.js
import mongoose from "mongoose";
import slugify from "slugify";

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
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const SetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    images: { type: [SetImageSchema], default: [] },
    show: { type: Boolean, default: true },
    products: { type: [SetProductSchema], default: [] },
    stock: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SetSchema.index({ name: 1 }, { unique: true });
SetSchema.index({ slug: 1 });

SetSchema.pre("validate", async function (next) {
  if (this.isModified("name") || !this.slug) {
    const baseSlug = slugify(this.name, { lower: true, strict: true });
    let slugCandidate = baseSlug;
    let counter = 1;
    while (
      await mongoose.models.Set.exists({
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

export default mongoose.model("Set", SetSchema);
