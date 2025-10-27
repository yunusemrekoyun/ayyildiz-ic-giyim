import Joi from "joi";
import mongoose from "mongoose";
import Category from "../../models/Category.js";
import ProductLocale from "../../models/ProductLocale.js";

const objectIdSchema = Joi.string().hex().length(24);

const categoryBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  parentId: objectIdSchema.allow(null, ""),
  order: Joi.number().integer().min(0).max(9999).default(0),
});

async function updateDescendantAncestors(categoryId, siteCode, ancestors) {
  const children = await Category.find({ parentId: categoryId, siteCode }).lean();
  for (const child of children) {
    await Category.updateOne({ _id: child._id }, { $set: { ancestors } });
    await updateDescendantAncestors(child._id, siteCode, [...ancestors, child._id]);
  }
}

export async function listCategories(req, res) {
  try {
    const { siteCode } = req.tenant;
    const categories = await Category.find({ siteCode })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to list categories" });
  }
}

export async function getCategory(req, res) {
  try {
    const { siteCode } = req.tenant;
    const { id } = req.params;
    const isObjectId = !objectIdSchema.validate(id).error;
    const filter = isObjectId
      ? { _id: id, siteCode }
      : { slug: id, siteCode };
    const category = await Category.findOne(filter).lean();
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ category });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch category" });
  }
}

export async function createCategory(req, res) {
  try {
    const { siteCode } = req.tenant;
    const payload = await categoryBodySchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    let parentId = null;
    let ancestors = [];
    if (payload.parentId) {
      parentId = new mongoose.Types.ObjectId(payload.parentId);
      const parentCategory = await Category.findOne({
        _id: parentId,
        siteCode,
      });
      if (!parentCategory) {
        return res.status(400).json({ message: "Parent category not found in this site" });
      }
      ancestors = [...(parentCategory.ancestors || []), parentCategory._id];
    }

    const category = await Category.create({
      siteCode,
      name: payload.name,
      parentId,
      ancestors,
      order: payload.order ?? 0,
    });

    res.status(201).json({ category: category.toObject() });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }
    const status = error.code === 11000 ? 409 : 500;
    res.status(status).json({ message: error.message || "Failed to create category" });
  }
}

export async function updateCategory(req, res) {
  try {
    const { siteCode } = req.tenant;
    const { id } = req.params;

    const payload = await categoryBodySchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const isObjectId = !objectIdSchema.validate(id).error;
    const category = await Category.findOne(
      isObjectId ? { _id: id, siteCode } : { slug: id, siteCode }
    );
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    let parentChanged = false;
    let ancestors = [];
    if (payload.parentId) {
      const parentId = new mongoose.Types.ObjectId(payload.parentId);
      if (parentId.equals(category._id)) {
        return res.status(400).json({ message: "Category cannot be its own parent" });
      }
      const parent = await Category.findOne({ _id: parentId, siteCode });
      if (!parent) {
        return res.status(400).json({ message: "Parent category not found in this site" });
      }
      category.parentId = parent._id;
      ancestors = [...(parent.ancestors || []), parent._id];
      category.ancestors = ancestors;
      parentChanged = true;
    } else {
      category.parentId = null;
      if (category.ancestors?.length) {
        category.ancestors = [];
        parentChanged = true;
      }
    }

    category.name = payload.name;
    category.order = payload.order ?? category.order;
    await category.save();

    if (parentChanged) {
      await updateDescendantAncestors(category._id, siteCode, category.ancestors.concat(category._id));
    }

    res.json({ category: category.toObject() });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }
    const status = error.code === 11000 ? 409 : 500;
    res.status(status).json({ message: error.message || "Failed to update category" });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { siteCode } = req.tenant;
    const { id } = req.params;

    const isObjectId = !objectIdSchema.validate(id).error;
    const category = await Category.findOne(
      isObjectId ? { _id: id, siteCode } : { slug: id, siteCode }
    );
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const childCount = await Category.countDocuments({
      parentId: category._id,
      siteCode,
    });
    if (childCount > 0) {
      return res
        .status(400)
        .json({ message: "Category has child categories and cannot be deleted" });
    }

    const productCount = await ProductLocale.countDocuments({
      categoryId: category._id,
      siteCode,
    });
    if (productCount > 0) {
      return res
        .status(400)
        .json({ message: "Category is assigned to products and cannot be deleted" });
    }

    await Category.deleteOne({ _id: id, siteCode });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete category" });
  }
}
