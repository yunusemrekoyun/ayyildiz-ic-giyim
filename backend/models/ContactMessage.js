import mongoose from "mongoose";
import { SITE_CODES } from "../constants/sites.js";

const ContactMessageSchema = new mongoose.Schema(
  {
    siteCode: {
      type: String,
      required: true,
      enum: SITE_CODES,
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: "" },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ["new", "resolved"],
      default: "new",
      index: true,
    },

    // basit anti-spam izleri
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

ContactMessageSchema.index({ createdAt: -1 });

export default mongoose.model("ContactMessage", ContactMessageSchema);
