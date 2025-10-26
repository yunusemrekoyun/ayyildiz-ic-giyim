import Category from "../models/Category.js";
import Product from "../models/Product.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";
import { configureCloudinary } from "../config/cloudinary.js";
import {
  assignLocalizedBulk,
  assignLocalizedFields,
  DEFAULT_LANGUAGE,
  parseLocalizedPayload,
  pickLocalizedField,
  sanitizeLocalizedStrings,
  toLocalizedObject,
} from "../utils/i18n.js";

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

const shapeCategory = (doc, { lang, includeLocalized = false } = {}) => {
  if (!doc) return null;

  const id = doc._id?.toString?.() || doc.id?.toString?.() || String(doc._id);
  const parentId = doc.parent
    ? doc.parent?.toString?.() || String(doc.parent)
    : null;
  const ancestors = Array.isArray(doc.ancestors)
    ? doc.ancestors.map((entry) => entry?.toString?.() || entry)
    : [];

  const payload = {
    id,
    name: pickLocalizedField(doc, "name", lang, DEFAULT_LANGUAGE) || "",
    slug: doc.slug,
    parent: parentId,
    level: doc.level,
    ancestors,
    image: toPlainImage(doc.image),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (includeLocalized) {
    payload.localized = toLocalizedObject(doc.localized);
  }

  return payload;
};

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

    const localizedPayloadRaw = parseLocalizedPayload(req.body.localized);
    const localizedStrings = sanitizeLocalizedStrings(
      ["name"],
      localizedPayloadRaw
    );

    if (!localizedStrings[DEFAULT_LANGUAGE]) {
      localizedStrings[DEFAULT_LANGUAGE] = { name };
    } else if (!localizedStrings[DEFAULT_LANGUAGE].name) {
      localizedStrings[DEFAULT_LANGUAGE].name = name;
    }

    const data = {
      name,
      parent: parentDoc?._id ?? null,
      localized: localizedStrings,
    };
    if (imagePayload) data.image = imagePayload;

    const category = await Category.create(data);

    res.status(201).json({
      category: shapeCategory(category, {
        lang: req.locale,
        includeLocalized: true,
      }),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function listCategories(req, res) {
  try {
    const { parent } = req.query;
    const filter = {};
    const includeLocalized = parseBoolean(
      req.query.includeLocalized,
      Boolean(req.user?.role === "admin")
    );

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
    res.json({
      categories: categories.map((doc) =>
        shapeCategory(doc, { lang: req.locale, includeLocalized })
      ),
    });
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

    const includeLocalized = parseBoolean(
      req.query.includeLocalized,
      Boolean(req.user?.role === "admin")
    );

    res.json({
      category: shapeCategory(category, {
        lang: req.locale,
        includeLocalized,
      }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const { idOrSlug } = req.params;
    const {
      name,
      parent = undefined,
      removeImage = undefined,
      localized: localizedRaw = undefined,
    } = req.body;

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

    const localizedPayload = sanitizeLocalizedStrings(
      ["name"],
      parseLocalizedPayload(localizedRaw) || {}
    );
    assignLocalizedBulk(category, localizedPayload, ["name"]);
    assignLocalizedFields(
      category,
      DEFAULT_LANGUAGE,
      { name: category.name },
      ["name"]
    );

    await category.save();
    res.json({
      category: shapeCategory(category, {
        lang: req.locale,
        includeLocalized: true,
      }),
    });
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
    const includeLocalized = parseBoolean(
      req.query.includeLocalized,
      Boolean(req.user?.role === "admin")
    );

    const categories = await Category.find().sort({ level: 1, name: 1 }).lean();
    const shaped = categories.map((doc) =>
      shapeCategory(doc, { lang: req.locale, includeLocalized })
    );

    const byId = new Map();
    shaped.forEach((cat) => {
      byId.set(String(cat.id), { ...cat, children: [] });
    });

    const roots = [];
    byId.forEach((cat) => {
      if (cat.parent) {
        const parent = byId.get(String(cat.parent));
        if (parent) parent.children.push(cat);
      } else {
        roots.push(cat);
      }
    });

    const sortTree = (nodes) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((node) => sortTree(node.children || []));
    };
    sortTree(roots);

    res.json({ categories: roots });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
