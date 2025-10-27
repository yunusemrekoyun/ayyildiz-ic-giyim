import mongoose from "mongoose";

const ProductImageSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    w: { type: Number },
    h: { type: Number },
    format: { type: String, trim: true },
  },
  { _id: false }
);

const ProductBaseSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true },
    basePrice: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      enum: ["EUR"],
      default: "EUR",
      required: true,
    },
    isActive: { type: Boolean, default: true },
    listedInCatalog: { type: Boolean, default: true },
    colors: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    showColors: { type: Boolean, default: true },
    showSizes: { type: Boolean, default: true },
    customAttribute: {
      type: new mongoose.Schema(
        {
          title: { type: String, default: "" },
          values: { type: [String], default: [] },
          show: { type: Boolean, default: false },
        },
        { _id: false }
      ),
      default: () => ({ title: "", values: [], show: false }),
    },
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      default: null,
    },
    images: { type: [ProductImageSchema], default: [] },
  },
  { timestamps: true }
);

ProductBaseSchema.index({ createdAt: -1 });

export default mongoose.model("ProductBase", ProductBaseSchema);
