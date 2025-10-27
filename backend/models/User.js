// backend/models/User.js
import mongoose from "mongoose";
import { SITE_CODES } from "../constants/sites.js";

const ROLE_VALUES = ["user", "admin"];

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },

    roles: {
      type: [String],
      default: ["user"],
      enum: ROLE_VALUES,
      validate: {
        validator(value) {
          if (!Array.isArray(value) || !value.length) return false;
          return value.every((role) => ROLE_VALUES.includes(role));
        },
        message: "Invalid role value",
      },
      set(roles = []) {
        const list = Array.from(
          new Set(
            roles
              .filter(Boolean)
              .map((role) => String(role).toLowerCase().trim())
              .filter((role) => ROLE_VALUES.includes(role))
          )
        );
        return list.length ? list : ["user"];
      },
    },
    allowedSites: {
      type: [String],
      enum: SITE_CODES,
      default: undefined,
    },

    refreshToken: { type: String, default: null },

    // 🔽 Soft delete alanları
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deletedAlias: { type: String, default: "" }, // "Deleted account" gibi gösterim adı
  },
  { timestamps: true }
);

UserSchema.virtual("role")
  .get(function () {
    return Array.isArray(this.roles) && this.roles.length
      ? this.roles[0]
      : "user";
  })
  .set(function (value) {
    if (!value) return;
    const normalized = String(value).toLowerCase();
    if (ROLE_VALUES.includes(normalized)) {
      this.roles = [normalized];
    }
  });

UserSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

UserSchema.methods.hasRole = function hasRole(role) {
  if (!role) return false;
  const target = String(role).toLowerCase();
  return Array.isArray(this.roles)
    ? this.roles.some((value) => String(value).toLowerCase() === target)
    : false;
};

export default mongoose.model("User", UserSchema);
