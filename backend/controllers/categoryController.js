import Category from "../models/Category.js";
import Product from "../models/Product.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";
import { configureCloudinary } from "../config/cloudinary.js";

const isValidObjectId = (val) =>
  typeof val === "string" && val.match(/^[0-9a-fA-F]{24}$/);

const toPlainImage = (image) => {
  if (!image) return null;
  return {
    url: image.url,
    publicId: image.publicId,
    width: image.width,
    height: image.height,
    format: image.format,
  };
};

const shapeCategory = (doc) => ({
  id: doc._id,
  name: doc.name,
  slug: doc.slug,
  parent: doc.parent,
  level: doc.level,
  ancestors: doc.ancestors,
  image: toPlainImage(doc.image),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }
  return false;
};

const resolveCategoryFolder = () => {
  const instance = configureCloudinary();
  const base = (instance.uploadFolder || "ayyildiz/uploads").replace(/\/+$/, "");
  return `${base}/categories`;
};

const toImagePayload = (uploadResult) => ({
  url: uploadResult.secure_url,
  publicId: uploadResult.public_id,
  width: uploadResult.width,
  height: uploadResult.height,
  format: uploadResult.format,
});

export async function createCategory(req, res) {
  try {
    const { name, parent = null } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    let parentDoc = null;
    if (parent) {
      parentDoc = isValidObjectId(parent)
        ? await Category.findById(parent)
        : await Category.findOne({ slug: parent });
      if (!parentDoc) {
        return res.status(400).json({ message: "Parent category not found" });
      }
    }

    let imagePayload = null;
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
        folder: resolveCategoryFolder(),
      });
      imagePayload = toImagePayload(uploadResult);
    }

    const data = {
      name,
      parent: parentDoc?._id ?? null,
    };
    if (imagePayload) data.image = imagePayload;

    const category = await Category.create(data);

    res.status(201).json({ category: shapeCategory(category) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function listCategories(req, res) {
  try {
    const { parent } = req.query;
    const filter = {};

    if (parent === "root") filter.parent = null;
    else if (parent) {
      const parentDoc = isValidObjectId(parent)
        ? await Category.findById(parent)
        : await Category.findOne({ slug: parent });
      if (!parentDoc) {
        return res.status(400).json({ message: "Parent category not found" });
      }
      filter.parent = parentDoc._id;
    }

    const categories = await Category.find(filter).sort({ level: 1, name: 1 });
    res.json({ categories: categories.map(shapeCategory) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function getCategory(req, res) {
  try {
    const { idOrSlug } = req.params;
    const category = isValidObjectId(idOrSlug)
      ? await Category.findById(idOrSlug)
      : await Category.findOne({ slug: idOrSlug });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ category: shapeCategory(category) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const { idOrSlug } = req.params;
    const { name, parent = undefined, removeImage = undefined } = req.body;

    const category = isValidObjectId(idOrSlug)
      ? await Category.findById(idOrSlug)
      : await Category.findOne({ slug: idOrSlug });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (name) category.name = name;

    if (parent !== undefined) {
      if (!parent) {
        category.parent = null;
      } else {
        const parentDoc = isValidObjectId(parent)
          ? await Category.findById(parent)
          : await Category.findOne({ slug: parent });
        if (!parentDoc) {
          return res.status(400).json({ message: "Parent category not found" });
        }
        if (String(parentDoc._id) === String(category._id)) {
          return res
            .status(400)
            .json({ message: "Category cannot be its own parent" });
        }
        if (parentDoc.ancestors?.includes(category._id)) {
          return res
            .status(400)
            .json({ message: "Cannot set a descendant as parent" });
        }
        category.parent = parentDoc._id;
      }
    }

    if (req.file) {
      if (category.image?.publicId) {
        await deleteFromCloudinary(category.image.publicId).catch(() => {});
      }
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
        folder: resolveCategoryFolder(),
      });
      category.image = toImagePayload(uploadResult);
      category.markModified("image");
    } else if (removeImage !== undefined && parseBoolean(removeImage)) {
      if (category.image?.publicId) {
        await deleteFromCloudinary(category.image.publicId).catch(() => {});
      }
      category.image = undefined;
      category.markModified("image");
    }

    await category.save();
    res.json({ category: shapeCategory(category) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { idOrSlug } = req.params;
    const category = isValidObjectId(idOrSlug)
      ? await Category.findById(idOrSlug)
      : await Category.findOne({ slug: idOrSlug });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const hasChildren = await Category.exists({ parent: category._id });
    if (hasChildren) {
      return res
        .status(400)
        .json({ message: "Category has child categories and cannot be removed" });
    }

    const hasProducts = await Product.exists({ category: category._id });
    if (hasProducts) {
      return res
        .status(400)
        .json({ message: "Category has products and cannot be removed" });
    }

    if (category.image?.publicId) {
      await deleteFromCloudinary(category.image.publicId).catch(() => {});
    }

    await Category.findByIdAndDelete(category._id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function getCategoryTree(req, res) {
  try {
    const categories = await Category.find().sort({ level: 1, name: 1 }).lean();

    const byId = new Map();
    categories.forEach((cat) => byId.set(String(cat._id), { ...cat, children: [] }));

    const roots = [];
    byId.forEach((cat) => {
      if (cat.parent) {
        const parent = byId.get(String(cat.parent));
        if (parent) parent.children.push(cat);
      } else {
        roots.push(cat);
      }
    });

    const format = (node) => ({
      id: node._id,
      name: node.name,
      slug: node.slug,
      level: node.level,
      image: toPlainImage(node.image),
      children: node.children.map(format),
    });

    res.json({ categories: roots.map(format) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
