import mongoose from "mongoose";
import Campaign from "../models/Campaign.js";
import Product from "../models/Product.js";
import SetModel from "../models/Set.js";
import Category from "../models/Category.js";
import Discount from "../models/Discount.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";
import { configureCloudinary } from "../config/cloudinary.js";
import { shapeProduct } from "../utils/productHelpers.js";
import {
  fetchActiveDiscounts,
  computeProductDiscountMap,
  mapDiscountsToSets,
  applyDiscount,
} from "../utils/discountHelpers.js";
import { hydrateProductsWithInventory } from "../utils/stockItemHelpers.js";

const isValidObjectId = (value) =>
  typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);

const toObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(value);

function normalizeIds(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .flatMap(normalizeIds)
      .filter(Boolean)
      .map((item) => item.trim?.() || item)
      .filter(Boolean);
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return normalizeIds(parsed);
    } catch (_) {
      /* ignore parse errors */
    }
    return trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (typeof input === "object" && input?.id) {
    return normalizeIds(String(input.id));
  }
  return [];
}

async function fetchDiscounts(ids) {
  if (!ids.length) return [];
  const unique = Array.from(new Set(ids.map((id) => id && id.toString()))).filter(
    Boolean
  );
  if (!unique.length) return [];

  const invalid = unique.filter((id) => !isValidObjectId(id));
  if (invalid.length) {
    throw new Error(`Invalid discount id(s): ${invalid.join(", ")}`);
  }

  const discounts = await Discount.find({
    _id: { $in: unique.map((id) => toObjectId(id)) },
  }).lean();
  if (discounts.length !== unique.length) {
    const existing = new Set(discounts.map((doc) => doc._id.toString()));
    const missing = unique.filter((id) => !existing.has(id));
    throw new Error(
      missing.length
        ? `The following discount(s) were not found: ${missing.join(", ")}`
        : "Selected discounts were not found"
    );
  }
  return discounts;
}

function resolveUploadFolder() {
  const instance = configureCloudinary();
  const base = (instance.uploadFolder || "ayyildiz/uploads").replace(
    /\/+$/,
    ""
  );
  return `${base}/campaigns`;
}

async function uploadImage(file) {
  if (!file) throw new Error("Campaign image is required");
  const result = await uploadBufferToCloudinary(file.buffer, {
    folder: resolveUploadFolder(),
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

async function expandCategoryIds(categoryIds = []) {
  if (!categoryIds.length) return [];
  const objectIds = categoryIds.map((id) => toObjectId(id));

  const docs = await Category.find(
    {
      $or: [
        { _id: { $in: objectIds } },
        { ancestors: { $in: objectIds } },
      ],
    },
    { _id: 1 }
  ).lean();

  return Array.from(new Set(docs.map((doc) => doc._id.toString())));
}

function computeTargetFlags({ setIds, productIds, categoryIds, discounts }) {
  const discountHasSets = discounts.some(
    (discount) => discount.appliesTo?.sets?.length
  );
  const discountHasProducts = discounts.some((discount) => {
    const appliesTo = discount.appliesTo || {};
    return (
      (appliesTo.products && appliesTo.products.length) ||
      (appliesTo.categories && appliesTo.categories.length)
    );
  });

  const hasSets = setIds.length > 0 || discountHasSets;
  const hasProducts =
    productIds.length > 0 || categoryIds.length > 0 || discountHasProducts;
  return { hasSets, hasProducts, discountHasSets, discountHasProducts };
}

function findMixedDiscounts(discounts) {
  return discounts
    .filter((discount) => {
      const appliesTo = discount.appliesTo || {};
      const hasSets = (appliesTo.sets || []).length > 0;
      const hasProducts =
        (appliesTo.products || []).length > 0 ||
        (appliesTo.categories || []).length > 0;
      return hasSets && hasProducts;
    })
    .map((discount) => ({
      id: discount._id.toString(),
      name: discount.name,
    }));
}

function shapeCampaign(doc, { includeTarget = false } = {}) {
  if (!doc) return null;
  const id = doc._id?.toString?.() || String(doc._id);
  const target = doc.target || {};
  const targetSummary = {
    type: target.type || "PRODUCTS",
    products: target.products?.length || 0,
    sets: target.sets?.length || 0,
    categories: target.categories?.length || 0,
    discounts: target.discounts?.length || 0,
  };

  const computedLink =
    (target.type || "PRODUCTS") === "SETS"
      ? `/sets?campaign=${id}`
      : `/shop?campaign=${id}`;

  const base = {
    id,
    name: doc.name,
    description: doc.description || "",
    badge: doc.badge || "",
    ctaText: doc.ctaText || "",
    layout: doc.layout || "SMALL",
    image: doc.image
      ? {
          url: doc.image.url,
          publicId: doc.image.publicId,
          width: doc.image.width,
          height: doc.image.height,
          format: doc.image.format,
        }
      : null,
    isActive: !!doc.isActive,
    sortOrder: Number(doc.sortOrder) || 0,
    targetSummary,
    computedLink,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (includeTarget) {
    base.target = {
      type: target.type || "PRODUCTS",
      products: (target.products || []).map((id) => id.toString()),
      sets: (target.sets || []).map((id) => id.toString()),
      categories: (target.categories || []).map((id) => id.toString()),
      discounts: (target.discounts || []).map((id) => id.toString()),
    };
  }

  return base;
}

async function resolveProductCampaignItems(campaign) {
  const target = campaign.target || {};
  const directProductIds = new Set(
    (target.products || []).map((id) => id.toString())
  );
  const directCategoryIds = await expandCategoryIds(
    (target.categories || []).map((id) => id.toString())
  );

  const discounts = await Discount.find({
    _id: { $in: (target.discounts || []).map((id) => toObjectId(id)) },
  }).lean();

  discounts.forEach((discount) => {
    const appliesTo = discount.appliesTo || {};
    console.log('[campaign:resolve] discount coverage', {
      discountId: discount._id?.toString?.(),
      products: appliesTo.products?.map?.((id) => id.toString()),
      sets: appliesTo.sets?.map?.((id) => id.toString()),
      categories: appliesTo.categories?.map?.((id) => id.toString()),
    });
    (appliesTo.products || []).forEach((id) =>
      directProductIds.add(id.toString())
    );
  });

  const discountCategoryIds = await expandCategoryIds(
    discounts
      .flatMap((discount) => discount.appliesTo?.categories || [])
      .map((id) => id.toString())
  );

  const categoryIds = new Set([
    ...directCategoryIds,
    ...discountCategoryIds,
  ]);

  const categoryFilterIds = Array.from(categoryIds).map((id) => toObjectId(id));

  if (categoryFilterIds.length) {
    const products = await Product.find(
      { category: { $in: categoryFilterIds } },
      { _id: 1 }
    ).lean();
    products.forEach((product) => directProductIds.add(product._id.toString()));
  }

  const finalProductIds = Array.from(directProductIds);
  console.log("[campaign:resolveProduct] coverage", {
    directProductIds: Array.from(directProductIds),
    directCategoryIds,
    discountCategoryIds,
    finalProductIds,
  });
  if (!finalProductIds.length) return [];

  const products = await Product.find({
    _id: { $in: finalProductIds.map((id) => toObjectId(id)) },
  })
    .populate("category")
    .lean();
  await hydrateProductsWithInventory(products);

  const activeDiscounts = await fetchActiveDiscounts();
  const discountMap = activeDiscounts.length
    ? computeProductDiscountMap(activeDiscounts, products)
    : new Map();

  return products
    .map((product) =>
      shapeProduct(product, {
        discount: discountMap.get(product._id.toString()) || null,
      })
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function resolveSetCampaignItems(campaign) {
  const target = campaign.target || {};
  const directSetIds = new Set(
    (target.sets || []).map((id) => id.toString())
  );

  const discounts = await Discount.find({
    _id: { $in: (target.discounts || []).map((id) => toObjectId(id)) },
  }).lean();

  discounts.forEach((discount) => {
    console.log('[campaign:resolve] discount coverage set', {
      discountId: discount._id?.toString?.(),
      sets: discount.appliesTo?.sets?.map?.((id) => id.toString()),
    });
    (discount.appliesTo?.sets || []).forEach((id) =>
      directSetIds.add(id.toString())
    );
  });

  const finalSetIds = Array.from(directSetIds);
  console.log('[campaign:resolveSet] coverage', {
    directSetIds: Array.from(directSetIds),
    finalSetIds,
  });
  if (!finalSetIds.length) return [];

  const sets = await SetModel.find({
    _id: { $in: finalSetIds.map((id) => toObjectId(id)) },
  })
    .populate({
      path: "products.product",
      populate: { path: "category" },
    })
    .lean();
  const componentProducts = sets
    .flatMap((set) =>
      (set.products || []).map((entry) => entry.product).filter(Boolean)
    )
    .filter(Boolean);
  if (componentProducts.length) {
    await hydrateProductsWithInventory(componentProducts);
  }

  const activeDiscounts = await fetchActiveDiscounts();
  const setDiscountMap = activeDiscounts.length
    ? mapDiscountsToSets(activeDiscounts, finalSetIds)
    : new Map();
  const productDiscountMap = activeDiscounts.length
    ? computeProductDiscountMap(
        activeDiscounts,
        sets.flatMap((set) =>
          (set.products || []).map((entry) => entry.product).filter(Boolean)
        )
      )
    : new Map();

  return sets
    .map((set) => {
      const discount = setDiscountMap.get(set._id.toString()) || null;
      const basePrice = Number(set.price) || 0;
      const { finalPrice } = applyDiscount(basePrice, discount);
      return {
        id: set._id.toString(),
        name: set.name,
        slug: set.slug,
        description: set.description || "",
        price: basePrice,
        finalPrice,
        discount,
        hasDiscount: Boolean(discount) && basePrice !== finalPrice,
        show: !!set.show,
        stock: Number(set.stock || 0),
        images: set.images || [],
        products: (set.products || []).map((entry) => ({
          quantity: entry.quantity,
          product: entry.product
            ? shapeProduct(entry.product, {
                discount:
                  productDiscountMap.get(
                    entry.product?._id?.toString?.() ||
                      entry.product?.id?.toString?.() ||
                      ""
                  ) || null,
              })
            : null,
        })),
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listActiveCampaigns(req, res) {
  try {
    const campaigns = await Campaign.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    res.json({
      campaigns: campaigns.map((campaign) => shapeCampaign(campaign)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function listCampaignsAdmin(req, res) {
  try {
    const includeInactive =
      String(req.query.includeInactive || "").toLowerCase() === "true";
    const filter = includeInactive ? {} : { isActive: true };

    const campaigns = await Campaign.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    res.json({
      campaigns: campaigns.map((campaign) =>
        shapeCampaign(campaign, { includeTarget: true })
      ),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function getCampaign(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid campaign id" });
    }
    const campaign = await Campaign.findById(id).lean();
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    res.json({ campaign: shapeCampaign(campaign, { includeTarget: true }) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function parsePayload(req, { isUpdate = false } = {}) {
  const {
    name,
    description,
    badge,
    ctaText,
    layout,
    isActive,
    sortOrder,
  } = req.body;

  if (!isUpdate && !name) {
    throw new Error("Campaign name is required");
  }

  const payload = {};
  if (name !== undefined) payload.name = String(name).trim();
  if (description !== undefined) payload.description = String(description || "");
  if (badge !== undefined) payload.badge = String(badge || "");
  if (ctaText !== undefined) payload.ctaText = String(ctaText || "");
  if (layout !== undefined) {
    const upper = String(layout).trim().toUpperCase();
    if (!["BIG", "WIDE", "SMALL"].includes(upper)) {
      throw new Error("Invalid layout value. Use BIG, WIDE or SMALL.");
    }
    payload.layout = upper;
  }
  if (isActive !== undefined) {
    payload.isActive =
      typeof isActive === "string"
        ? ["true", "1", "yes", "on"].includes(isActive.trim().toLowerCase())
        : Boolean(isActive);
  }
  if (sortOrder !== undefined) {
    const parsedOrder = Number(sortOrder);
    if (!Number.isFinite(parsedOrder)) {
      throw new Error("Sort order must be a number");
    }
    payload.sortOrder = parsedOrder;
  }

  const productIds = normalizeIds(req.body.products);
  const setIds = normalizeIds(req.body.sets);
  const categoryIds = normalizeIds(req.body.categories);
  const discountIds = normalizeIds(req.body.discounts);

  console.log("[campaign:parsePayload] raw ids", {
    productIds,
    setIds,
    categoryIds,
    discountIds,
  });

  const targetInputProvided =
    productIds.length || setIds.length || categoryIds.length || discountIds.length;

  if (!targetInputProvided) {
    if (isUpdate) {
      return payload;
    }
    throw new Error(
      "Select at least one product, category, set or discount for the campaign."
    );
  }

  const discountDocs = await fetchDiscounts(discountIds);

  const productIdSet = new Set();
  const setIdSet = new Set();
  const categoryIdSet = new Set();

  for (const id of productIds || []) {
    if (id) productIdSet.add(id.toString());
  }
  for (const id of setIds || []) {
    if (id) setIdSet.add(id.toString());
  }
  for (const id of categoryIds || []) {
    if (id) categoryIdSet.add(id.toString());
  }

  discountDocs.forEach((discount) => {
    const appliesTo = discount.appliesTo || {};
    (appliesTo.products || []).forEach((id) =>
      id ? productIdSet.add(id.toString()) : null
    );
    (appliesTo.sets || []).forEach((id) =>
      id ? setIdSet.add(id.toString()) : null
    );
    (appliesTo.categories || []).forEach((id) =>
      id ? categoryIdSet.add(id.toString()) : null
    );
  });

  const derivedProducts = Array.from(productIdSet);
  const derivedSets = Array.from(setIdSet);
  const derivedCategories = Array.from(categoryIdSet);
  const normalizedDiscountIds = discountIds.map((id) => toObjectId(id));
  console.log("[campaign:parsePayload] coverage", {
    derivedProducts,
    derivedSets,
    derivedCategories,
    discountDocs: discountDocs.map((doc) => doc._id?.toString?.() || null),
  });

  const mixedDiscounts = findMixedDiscounts(discountDocs);
  if (mixedDiscounts.length) {
    throw new Error(
      `Cannot use discount(s) that target both sets and products: ${mixedDiscounts
        .map((d) => d.name || d.id)
        .join(", ")}`
    );
  }

  const { hasSets, hasProducts } = computeTargetFlags({
    setIds: derivedSets,
    productIds: derivedProducts,
    categoryIds: derivedCategories,
    discounts: discountDocs,
  });

  if (hasSets && hasProducts) {
    throw new Error(
      "Campaign cannot target sets together with products or categories. Please pick one target type."
    );
  }

  payload.target = {
    type: hasSets ? "SETS" : "PRODUCTS",
    products: hasSets ? [] : derivedProducts.map((id) => toObjectId(id)),
    sets: hasSets ? derivedSets.map((id) => toObjectId(id)) : [],
    categories: hasSets ? [] : derivedCategories.map((id) => toObjectId(id)),
    discounts: normalizedDiscountIds,
  };

  if (!payload.target.products.length && payload.target.type === "PRODUCTS") {
    payload.target.products = [];
  }
  if (!payload.target.categories.length && payload.target.type === "PRODUCTS") {
    payload.target.categories = [];
  }

  return payload;
}

export async function createCampaign(req, res) {
  try {
    console.log("[campaign:create] body", req.body);
    const payload = await parsePayload(req, { isUpdate: false });
    const image = await uploadImage(req.file);

    if (
      !payload.target ||
      (!payload.target.products?.length &&
        !payload.target.sets?.length &&
        !payload.target.categories?.length &&
        !payload.target.discounts?.length)
    ) {
      return res
        .status(400)
        .json({ message: "Campaign target must include at least one selection." });
    }

    payload.target.type = payload.target.sets?.length ? "SETS" : "PRODUCTS";

    if (payload.sortOrder === undefined) {
      const count = await Campaign.countDocuments();
      payload.sortOrder = count;
    }

    const campaign = await Campaign.create({
      ...payload,
      image,
    });
    res.status(201).json({
      campaign: shapeCampaign(campaign.toObject(), {
        includeTarget: true,
      }),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateCampaign(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid campaign id" });
    }
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    console.log("[campaign:update] body", req.body);
    const payload = await parsePayload(req, {
      isUpdate: true,
    });

    if (
      payload.target &&
      !payload.target.products?.length &&
      !payload.target.sets?.length &&
      !payload.target.categories?.length &&
      !payload.target.discounts?.length
    ) {
      return res
        .status(400)
        .json({ message: "Campaign target must include at least one selection." });
    }

    if (payload.target) {
      payload.target.type = payload.target.sets?.length ? "SETS" : "PRODUCTS";
    }

    if (req.file) {
      if (campaign.image?.publicId) {
        await deleteFromCloudinary(campaign.image.publicId);
      }
      payload.image = await uploadImage(req.file);
    }

    campaign.set(payload);
    await campaign.save();
    res.json({
      campaign: shapeCampaign(campaign.toObject(), {
        includeTarget: true,
      }),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteCampaign(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid campaign id" });
    }
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    if (campaign.image?.publicId) {
      await deleteFromCloudinary(campaign.image.publicId);
    }
    await campaign.deleteOne();
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function reorderCampaigns(req, res) {
  try {
    const orders = Array.isArray(req.body.orders) ? req.body.orders : [];
    const mappings = orders
      .map((entry) => ({
        id: entry?.id && entry.id.toString(),
        sortOrder: Number(entry?.sortOrder),
      }))
      .filter(
        (entry) =>
          entry.id && isValidObjectId(entry.id) && Number.isFinite(entry.sortOrder)
      );

    const bulkOps = mappings.map((entry) => ({
      updateOne: {
        filter: { _id: entry.id },
        update: { $set: { sortOrder: entry.sortOrder } },
      },
    }));

    if (bulkOps.length) {
      await Campaign.bulkWrite(bulkOps);
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function resolveCampaign(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid campaign id" });
    }
    const campaign = await Campaign.findById(id).lean();
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    const targetType = campaign.target?.type || "PRODUCTS";
    if (targetType === "SETS") {
      const items = await resolveSetCampaignItems(campaign);
      console.log("[campaign:resolve] sets", { id, targetType, count: items.length });
      return res.json({
        campaign: shapeCampaign(campaign, { includeTarget: true }),
        items,
        targetType,
      });
    }

    const items = await resolveProductCampaignItems(campaign);
    console.log("[campaign:resolve] products", { id, targetType, count: items.length });
    return res.json({
      campaign: shapeCampaign(campaign, { includeTarget: true }),
      items,
      targetType,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
