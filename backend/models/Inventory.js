import mongoose from "mongoose";

const InventoryVariantSchema = new mongoose.Schema(
  {
    color: { type: String, trim: true, default: null },
    size: { type: String, trim: true },
    attributeValue: { type: String, trim: true, default: null },
    stock: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const InventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductBase",
      required: true,
      unique: true,
      index: true,
    },
    variants: {
      type: [InventoryVariantSchema],
      default: [],
    },
    totalStock: { type: Number, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

InventorySchema.pre("save", function recomputeTotals(next) {
  if (this.isModified("variants")) {
    const totalFromVariants = this.variants.reduce(
      (acc, variant) => acc + (variant.stock || 0),
      0
    );
    this.totalStock = totalFromVariants;
  }

  if (this.reservedStock > this.totalStock) {
    this.reservedStock = this.totalStock;
  }

  next();
});

export default mongoose.model("Inventory", InventorySchema);
