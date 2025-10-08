import mongoose from "mongoose";
import Discount from "../models/Discount.js";
import Product from "../models/Product.js";
import Set from "../models/Set.js";
import Category from "../models/Category.js";

const TARGET_POPULATE = [
  { path: "appliesTo.products", select: "name slug price images" },
  { path: "appliesTo.sets", select: "name slug price images" },
  { path: "appliesTo.categories", select: "name slug" },
];

async function validateObjectIds(ids = [], model, label = "item") {
  if (!Array.isArray(ids) || !ids.length) return [];

  const objectIds = [];
  for (const value of ids) {
    const raw = String(value ?? "").trim();
    if (!raw) {
      throw new Error(`Empty ${label} id supplied`);
    }
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(raw);
    } catch (error) {
      throw new Error(`Invalid ${label} id supplied (${raw})`);
    }
    objectIds.push(objectId);
  }

  const docs = await model
    .find({ _id: { $in: objectIds } }, { _id: 1 })
    .lean();
  if (docs.length !== objectIds.length) {
    const existing = new Set(docs.map((doc) => doc._id.toString()));
    const missing = objectIds
      .map((id) => id.toString())
      .filter((id) => !existing.has(id));
    throw new Error(
      missing.length
        ? `The following ${label}(s) were not found: ${missing.join(", ")}`
        : `Selected ${label}s were not found`
    );
  }

  return objectIds;
}

async function collectDescendantCategoryIds(categoryIds = []) {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) return [];

  const normalizedIds = categoryIds.map((id) =>
    new mongoose.Types.ObjectId(id)
  );

  const [categories, descendants] = await Promise.all([
    Category.find({ _id: { $in: normalizedIds } }, { _id: 1 }).lean(),
    Category.find({ ancestors: { $in: normalizedIds } }, { _id: 1 }).lean(),
  ]);

  const allIds = [
    ...(categories || []).map((doc) => doc._id.toString()),
    ...(descendants || []).map((doc) => doc._id.toString()),
  ];

  return Array.from(new Set(allIds));
}

async function collectProductsForCategories(categoryIds) {
  if (!categoryIds.length) return [];
  const allCategoryIds = await collectDescendantCategoryIds(categoryIds);
  if (!allCategoryIds.length) return [];
  const products = await Product.find(
    { category: { $in: allCategoryIds.map((id) => new mongoose.Types.ObjectId(id)) } },
    { _id: 1 }
  ).lean();
  return products.map((p) => p._id.toString());
}

async function expandCoverage({ products = [], sets = [], categories = [] }) {
  const coverageProducts = new Set(products.map((id) => id.toString()));
  const coverageSets = new Set(sets.map((id) => id.toString()));
  const coverageCategories = new Set(categories.map((id) => id.toString()));

  if (categories.length) {
    const descCategories = await collectDescendantCategoryIds(categories);
    descCategories.forEach((id) => coverageCategories.add(id));
    const productIds = await collectProductsForCategories(categories);
    productIds.forEach((id) => coverageProducts.add(id));
  }

  return {
    products: Array.from(coverageProducts),
    sets: Array.from(coverageSets),
    categories: Array.from(coverageCategories),
  };
}

function intersectValues(source = [], target = []) {
  if (!source.length || !target.length) return [];
  const lookup = new Set(source);
  return target.filter((value) => lookup.has(value));
}

async function computeConflicts({ products, sets, categories }, existingDiscounts) {
  const newCoverage = await expandCoverage({ products, sets, categories });
  if (
    !newCoverage.products.length &&
    !newCoverage.sets.length &&
    !newCoverage.categories.length
  ) {
    return [];
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[discounts] new coverage", {
      products: newCoverage.products,
      sets: newCoverage.sets,
      categories: newCoverage.categories,
    });
  }

  const conflicts = [];

  for (const discount of existingDiscounts) {
    const coverage = await expandCoverage({
      products: discount.appliesTo?.products || [],
      sets: discount.appliesTo?.sets || [],
      categories: discount.appliesTo?.categories || [],
    });
    if (process.env.NODE_ENV !== "production") {
      console.log("[discounts] checking against", {
        discountId: discount._id?.toString?.(),
        products: coverage.products,
        sets: coverage.sets,
        categories: coverage.categories,
      });
    }
    const overlappingProducts = intersectValues(
      newCoverage.products,
      coverage.products
    );
    const overlappingSets = intersectValues(newCoverage.sets, coverage.sets);
    const overlappingCategories = intersectValues(
      newCoverage.categories,
      coverage.categories
    );

    if (
      overlappingProducts.length ||
      overlappingSets.length ||
      overlappingCategories.length
    ) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[discounts] conflict detected", {
          existingId: discount._id?.toString?.(),
          overlappingProducts,
          overlappingSets,
          overlappingCategories,
        });
      }
      conflicts.push({
        discount,
        products: overlappingProducts,
        sets: overlappingSets,
        categories: overlappingCategories,
      });
    }
  }

  return conflicts;
}

function serializeConflicts(conflicts) {
  return conflicts.map((entry) => ({
    id: entry.discount._id,
    name: entry.discount.name,
    percentage: entry.discount.percentage,
    productIds: entry.products,
    setIds: entry.sets,
    categoryIds: entry.categories,
  }));
}

export async function listDiscounts(req, res) {
  const discounts = await Discount.find()
    .sort({ createdAt: -1 })
    .populate(TARGET_POPULATE)
    .lean();
  res.json({ discounts: discounts.map(shapeDiscount) });
}

export async function createDiscount(req, res) {
  try {
    const {
      name,
      description = "",
      percentage,
      products = [],
      sets = [],
      categories = [],
      resolve = null,
    } = req.body;

    if (process.env.NODE_ENV !== "production") {
      console.log("[discounts] create payload", {
        name,
        percentage,
        products,
        sets,
        categories,
        resolve,
      });
    }

    if (!name || percentage === undefined) {
      return res.status(400).json({ message: "Name and percentage are required" });
    }

    const parsedPercentage = Number(percentage);
    if (!Number.isFinite(parsedPercentage) || parsedPercentage <= 0 || parsedPercentage > 100) {
      return res.status(400).json({ message: "Percentage must be between 1-100" });
    }

    const productIds = await validateObjectIds(products, Product, "product");
    const setIds = await validateObjectIds(sets, Set, "set");
    const categoryIds = await validateObjectIds(
      categories,
      Category,
      "category"
    );

    if (!productIds.length && !setIds.length && !categoryIds.length) {
      return res.status(400).json({ message: "Select at least one target" });
    }

    const activeDiscounts = await Discount.find({ active: true }).lean();
    const conflicts = await computeConflicts(
      {
        products: productIds,
        sets: setIds,
        categories: categoryIds,
      },
      activeDiscounts
    );

    if (conflicts.length && !resolve) {
      return res.status(409).json({
        message: "Discount conflicts detected",
        conflicts: serializeConflicts(conflicts),
      });
    }

    let finalProducts = productIds;
    let finalSets = setIds;
    let finalCategories = categoryIds;

    if (conflicts.length && resolve) {
      const conflictingProductSet = new Set(
        conflicts.flatMap((entry) => entry.products)
      );
      const conflictingSetIds = new Set(
        conflicts.flatMap((entry) => entry.sets)
      );
      const conflictingCategoryIds = new Set(
        conflicts.flatMap((entry) => entry.categories)
      );

      if (resolve === "skip") {
        finalProducts = finalProducts.filter((id) => !conflictingProductSet.has(id.toString()));
        finalSets = finalSets.filter((id) => !conflictingSetIds.has(id.toString()));
        finalCategories = finalCategories.filter(
          (id) => !conflictingCategoryIds.has(id.toString())
        );
        if (!finalProducts.length && !finalSets.length && !finalCategories.length) {
          return res.status(400).json({
            message: "No targets remain after skipping conflicts",
          });
        }
      } else if (resolve === "overwrite") {
        const conflictIds = conflicts.map((entry) => entry.discount._id);
        await Discount.updateMany(
          { _id: { $in: conflictIds } },
          { $set: { active: false } }
        );
      } else if (resolve === "cancel") {
        return res.status(200).json({ cancelled: true });
      }
    }

    const discount = await Discount.create({
      name,
      description,
      percentage: parsedPercentage,
      appliesTo: {
        products: finalProducts,
        sets: finalSets,
        categories: finalCategories,
      },
      active: true,
    });

    await discount.populate(TARGET_POPULATE);

    res.status(201).json({ discount: shapeDiscount(discount) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateDiscount(req, res) {
  try {
    const { id } = req.params;
    const discount = await Discount.findById(id);
    if (!discount) {
      return res.status(404).json({ message: "Discount not found" });
    }

    const {
      name,
      description,
      percentage,
      products = [],
      sets = [],
      categories = [],
      active,
      resolve = null,
    } = req.body;

    if (name !== undefined) discount.name = String(name).trim();
    if (description !== undefined) discount.description = String(description);
    if (percentage !== undefined) {
      const parsed = Number(percentage);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
        return res.status(400).json({ message: "Percentage must be between 1-100" });
      }
      discount.percentage = parsed;
    }
    if (active !== undefined) discount.active = Boolean(active);

    let productIds = discount.appliesTo.products || [];
    let setIds = discount.appliesTo.sets || [];
    let categoryIds = discount.appliesTo.categories || [];

    if (products.length || sets.length || categories.length) {
      productIds = await validateObjectIds(products, Product, "product");
      setIds = await validateObjectIds(sets, Set, "set");
      categoryIds = await validateObjectIds(categories, Category, "category");
      if (!productIds.length && !setIds.length && !categoryIds.length) {
        return res.status(400).json({ message: "Select at least one target" });
      }

      const activeDiscounts = await Discount.find({
        active: true,
        _id: { $ne: discount._id },
      }).lean();
      const conflicts = await computeConflicts(
        { products: productIds, sets: setIds, categories: categoryIds },
        activeDiscounts
      );

      if (conflicts.length && !resolve) {
        return res.status(409).json({
          message: "Discount conflicts detected",
          conflicts: serializeConflicts(conflicts),
        });
      }

      if (conflicts.length && resolve) {
        const conflictingProductSet = new Set(
          conflicts.flatMap((entry) => entry.products)
        );
        const conflictingSetIds = new Set(
          conflicts.flatMap((entry) => entry.sets)
        );
        const conflictingCategoryIds = new Set(
          conflicts.flatMap((entry) => entry.categories)
        );

        if (resolve === "skip") {
          productIds = productIds.filter((id) => !conflictingProductSet.has(id.toString()));
          setIds = setIds.filter((id) => !conflictingSetIds.has(id.toString()));
          categoryIds = categoryIds.filter(
            (id) => !conflictingCategoryIds.has(id.toString())
          );
          if (!productIds.length && !setIds.length && !categoryIds.length) {
            return res.status(400).json({
              message: "No targets remain after skipping conflicts",
            });
          }
        } else if (resolve === "overwrite") {
          const conflictIds = conflicts.map((entry) => entry.discount._id);
          await Discount.updateMany(
            { _id: { $in: conflictIds } },
            { $set: { active: false } }
          );
        } else if (resolve === "cancel") {
          return res.status(200).json({ cancelled: true });
        }
      }

      discount.appliesTo = {
        products: productIds,
        sets: setIds,
        categories: categoryIds,
      };
    }

    await discount.save();
    await discount.populate(TARGET_POPULATE);
    res.json({ discount: shapeDiscount(discount) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteDiscount(req, res) {
  try {
    const { id } = req.params;
    await Discount.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

function normalizeRef(item) {
  if (!item) return null;
  if (typeof item === "string") {
    return { id: item, name: "" };
  }
  const id = item._id?.toString?.() || item.id?.toString?.();
  if (!id) {
    return { id: String(item), name: item.name || "" };
  }
  return {
    id,
    name: item.name || item.title || "",
    label: item.name || item.title || "",
    slug: item.slug || null,
    image: item.images?.[0]?.url || null,
  };
}

function shapeTargets(list = []) {
  return list
    .map((item) => normalizeRef(item))
    .filter((entry) => entry && entry.id);
}

function shapeDiscount(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: plain._id?.toString?.() || plain.id,
    name: plain.name,
    description: plain.description,
    percentage: plain.percentage,
    active: plain.active,
    startsAt: plain.startsAt,
    endsAt: plain.endsAt,
    appliesTo: {
      products: shapeTargets(plain.appliesTo?.products),
      sets: shapeTargets(plain.appliesTo?.sets),
      categories: shapeTargets(plain.appliesTo?.categories),
    },
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}
