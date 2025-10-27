import "dotenv/config";
import mongoose from "mongoose";
import slugify from "slugify";
import { connectDB } from "../config/db.js";
import { SITE_CODES, DEFAULT_SITE_CODE } from "../constants/sites.js";
import Category from "../models/Category.js";
import ProductBase from "../models/ProductBase.js";
import ProductLocale from "../models/ProductLocale.js";
import Inventory from "../models/Inventory.js";
import Page from "../models/Page.js";
import ContactMessage from "../models/ContactMessage.js";
import ContactConfig from "../models/ContactConfig.js";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const VERBOSE = args.has("--verbose");
const DEFAULT_SITE = DEFAULT_SITE_CODE || "de";

const { ObjectId } = mongoose.Types;

const slugTracker = {
  categories: new Map(),
  productLocales: new Map(),
  pages: new Map(),
  productSkus: new Set(),
};

function log(message, ...rest) {
  console.log(`[migrate] ${message}`, ...rest);
}

function warn(message, ...rest) {
  console.warn(`[migrate:warn] ${message}`, ...rest);
}

function verbose(message, ...rest) {
  if (VERBOSE) {
    console.log(`[migrate:detail] ${message}`, ...rest);
  }
}

function ensureTracker(map, key) {
  if (!map.has(key)) {
    map.set(key, new Set());
  }
  return map.get(key);
}

function uniqueSlug(siteCode, baseSlug, trackerMap) {
  const base = slugify(baseSlug || "untitled", { lower: true, strict: true, trim: true }) || "item";
  const registry = ensureTracker(trackerMap, siteCode);
  let candidate = base;
  let counter = 2;
  while (registry.has(candidate)) {
    candidate = `${base}-${counter++}`;
  }
  registry.add(candidate);
  return candidate;
}

function uniqueSku(desired) {
  const base = (desired || "").trim() || `SKU-${Math.random().toString(36).slice(2, 8)}`;
  let candidate = base;
  let counter = 2;
  while (slugTracker.productSkus.has(candidate)) {
    candidate = `${base}-${counter++}`;
  }
  slugTracker.productSkus.add(candidate);
  return candidate;
}

function normalizeStringArray(value) {
  if (!value) return [];
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? value.split(/[,\n]/)
    : [];
  return Array.from(
    new Set(
      source
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  );
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function extractLocalizedField(doc, key, siteCode) {
  if (!doc || typeof doc !== "object") return "";
  const direct = doc[`${key}_${siteCode}`];
  if (direct) return String(direct).trim();
  if (doc.translations && doc.translations[siteCode] && doc.translations[siteCode][key]) {
    return String(doc.translations[siteCode][key]).trim();
  }
  if (siteCode === DEFAULT_SITE && doc[key]) {
    return String(doc[key]).trim();
  }
  return "";
}

function extractSeo(doc, siteCode) {
  const seoSource =
    doc.seo ||
    doc[`seo_${siteCode}`] ||
    (doc.translations && doc.translations[siteCode] && doc.translations[siteCode].seo);
  if (!seoSource || typeof seoSource !== "object") {
    return { title: "", description: "", keywords: [] };
  }
  return {
    title: String(seoSource.title || "").trim(),
    description: String(seoSource.description || "").trim(),
    keywords: Array.isArray(seoSource.keywords)
      ? seoSource.keywords.map((kw) => String(kw).trim()).filter(Boolean)
      : String(seoSource.keywords || "")
          .split(",")
          .map((kw) => kw.trim())
          .filter(Boolean),
  };
}

function normalizeImages(images = []) {
  if (!Array.isArray(images)) return [];
  return images.map((img) => ({
    publicId: img.publicId || img.public_id || "",
    url: img.url || "",
    w: img.width || img.w || null,
    h: img.height || img.h || null,
    format: img.format || "",
  }));
}

function normalizeInventory(entries = []) {
  if (!Array.isArray(entries) || !entries.length) {
    return {
      variants: [],
      totalStock: 0,
      reservedStock: 0,
    };
  }
  const variantsMap = new Map();
  let total = 0;

  for (const entry of entries) {
    const stock =
      Number(entry.stockCatalog ?? entry.stock ?? entry.quantity ?? 0) || 0;
    total += stock;
    const color = entry.color ? String(entry.color).trim() : null;
    const size = entry.size ? String(entry.size).trim() : null;
    const attributeValue = entry.attributeValue
      ? String(entry.attributeValue).trim()
      : null;
    const key = [color || "", size || "", attributeValue || ""].join("::");
    const existing =
      variantsMap.get(key) || {
        color,
        size,
        attributeValue,
        stock: 0,
      };
    existing.stock += stock;
    variantsMap.set(key, existing);
  }

  return {
    variants: Array.from(variantsMap.values()),
    totalStock: total,
    reservedStock: 0,
  };
}

async function primeTrackers() {
  const [existingCategories, existingLocales, existingPages, existingBases] = await Promise.all([
    mongoose.connection
      .collection("categories")
      .find({ siteCode: { $exists: true } }, { projection: { siteCode: 1, slug: 1 } })
      .toArray(),
    mongoose.connection
      .collection("productlocales")
      .find({}, { projection: { siteCode: 1, slug: 1 } })
      .toArray()
      .catch(() => []),
    mongoose.connection
      .collection("pages")
      .find({}, { projection: { siteCode: 1, slug: 1 } })
      .toArray()
      .catch(() => []),
    ProductBase.find({}, { sku: 1 }).lean(),
  ]);

  for (const cat of existingCategories) {
    if (!cat.siteCode || !cat.slug) continue;
    ensureTracker(slugTracker.categories, cat.siteCode).add(cat.slug);
  }

  for (const locale of existingLocales) {
    if (!locale.siteCode || !locale.slug) continue;
    ensureTracker(slugTracker.productLocales, locale.siteCode).add(locale.slug);
  }

  for (const page of existingPages) {
    if (!page.siteCode || !page.slug) continue;
    ensureTracker(slugTracker.pages, page.siteCode).add(page.slug);
  }

  for (const base of existingBases) {
    if (base?.sku) slugTracker.productSkus.add(base.sku);
  }
}

async function migrateCategories() {
  const collection = mongoose.connection.collection("categories");
  const legacyDocs = await collection
    .find({ siteCode: { $exists: false } })
    .toArray();

  if (!legacyDocs.length) {
    log("Category migration skipped (no legacy documents detected).");
    return { created: 0, deleted: 0, mapping: new Map() };
  }

  log(`Migrating ${legacyDocs.length} legacy categories...`);
  const pending = new Map();
  const mapping = new Map();
  const legacyIds = [];

  for (const doc of legacyDocs) {
    const legacyId = doc._id.toString();
    legacyIds.push(doc._id);
    const parentLegacy =
      doc.parent?.toString?.() ||
      doc.parentId?.toString?.() ||
      doc.parentCategory?.toString?.() ||
      null;

    const localized = {};
    for (const site of SITE_CODES) {
      const name =
        extractLocalizedField(doc, "name", site) ||
        extractLocalizedField(doc, "title", site);
      if (!name) continue;
      const slugCandidate =
        extractLocalizedField(doc, "slug", site) ||
        extractLocalizedField(doc, "handle", site) ||
        name;
      localized[site] = {
        name,
        slug: slugCandidate,
        order: doc.order ?? doc.sort ?? 0,
      };
    }
    if (Object.keys(localized).length === 0 && doc.name) {
      const fallbackSite = DEFAULT_SITE;
      localized[fallbackSite] = {
        name: String(doc.name),
        slug: doc.slug || doc.name,
        order: doc.order ?? doc.sort ?? 0,
      };
    }
    pending.set(legacyId, {
      legacyId,
      parentLegacyId: parentLegacy,
      localized,
    });
  }

  const createdStats = { count: 0 };
  const unresolved = new Set(pending.keys());

  while (pending.size) {
    let progress = false;

    for (const [legacyId, record] of pending) {
      if (!record.localized || Object.keys(record.localized).length === 0) {
        pending.delete(legacyId);
        mapping.set(legacyId, {});
        unresolved.delete(legacyId);
        continue;
      }

      let parentsResolved = true;
      const parentMap = record.parentLegacyId
        ? mapping.get(record.parentLegacyId)
        : null;

      if (record.parentLegacyId && !parentMap) {
        parentsResolved = false;
      }

      if (!parentsResolved) {
        continue;
      }

    const siteMap = {};
      for (const site of SITE_CODES) {
      const data = record.localized[site];
      if (!data || !data.name) continue;
      const categoryPayload = {
        siteCode: site,
        name: data.name,
        slug: uniqueSlug(site, data.slug || data.name, slugTracker.categories),
        parentId: parentMap?.[site]?.id || null,
        ancestors: parentMap?.[site]
          ? [...(parentMap[site].ancestors || []), parentMap[site].id]
          : [],
        order: data.order ?? 0,
      };
      if (DRY_RUN) {
        const fakeId = new ObjectId();
        siteMap[site] = {
          id: fakeId,
          ancestors: categoryPayload.ancestors,
        };
        verbose(`(dry-run) category -> ${site} "${data.name}" slug=${categoryPayload.slug}`);
      } else {
        try {
          const created = await Category.create(categoryPayload);
          siteMap[site] = {
            id: created._id,
            ancestors: categoryPayload.ancestors,
          };
          createdStats.count += 1;
        } catch (error) {
          warn(`Failed to create category for ${site} "${data.name}": ${error.message}`);
        }
      }
      }

      mapping.set(legacyId, siteMap);
      pending.delete(legacyId);
      unresolved.delete(legacyId);
      progress = true;
    }

    if (!progress) {
      warn(
        `Unable to resolve ${pending.size} categories due to missing parents; aborting remaining.`
      );
      break;
    }
  }

  let deleted = 0;
  if (!DRY_RUN && legacyIds.length) {
    const result = await collection.deleteMany({ _id: { $in: legacyIds } });
    deleted = result.deletedCount || 0;
  }

  log(
    `Category migration finished: ${createdStats.count} created, ${deleted} legacy documents removed.`
  );
  return { created: createdStats.count, deleted, mapping };
}

async function migrateProducts(categoryMapping) {
  const productsCollection = mongoose.connection.collection("products");
  const legacyProducts = await productsCollection
    .find({ migratedAt: { $exists: false } })
    .toArray();

  if (!legacyProducts.length) {
    log("Product migration skipped (no legacy products detected).");
    return {
      bases: 0,
      locales: 0,
      inventories: 0,
      missingLocales: [],
    };
  }

  log(`Migrating ${legacyProducts.length} legacy products...`);

  const stats = {
    bases: 0,
    locales: 0,
    inventories: 0,
    missingLocales: [],
  };

  for (const legacy of legacyProducts) {
    const legacyId = legacy._id.toString();
    const baseSku = uniqueSku(legacy.sku || legacy.skuCode || legacy.slug || `SKU-${legacyId}`);
    const images = normalizeImages(legacy.images);
    const basePrice = Number(legacy.price ?? legacy.basePrice ?? 0);

    const basePayload = {
      sku: baseSku,
      basePrice,
      currency: "EUR",
      images,
      colors: normalizeStringArray(legacy.colors),
      sizes: normalizeStringArray(legacy.sizes),
      showColors: toBoolean(legacy.showColors, true),
      showSizes: toBoolean(legacy.showSizes, true),
      customAttribute: {
        title: legacy.customAttribute?.title || legacy.attributeTitle || "",
        values: normalizeStringArray(
          legacy.customAttribute?.values || legacy.attributeValues || []
        ),
        show: toBoolean(legacy.customAttribute?.show, false),
      },
      listedInCatalog: toBoolean(legacy.listedInCatalog, true),
      isActive: toBoolean(legacy.isActive, true),
    };

    let productBaseId;
    if (DRY_RUN) {
      productBaseId = new ObjectId();
      verbose(`(dry-run) product base -> ${baseSku}`);
    } else {
      try {
        const createdBase = await ProductBase.create(basePayload);
        productBaseId = createdBase._id;
        stats.bases += 1;
      } catch (error) {
        warn(`Failed to create ProductBase for legacy ${legacyId}: ${error.message}`);
        continue;
      }
    }

    const inventoryPayload = normalizeInventory(legacy.inventory || []);
    const reserved =
      Number(legacy.reservedStock ?? legacy.inventoryReserved ?? 0) || 0;
    inventoryPayload.reservedStock = Math.min(
      reserved,
      inventoryPayload.totalStock
    );
    if (DRY_RUN) {
      verbose(
        `(dry-run) inventory -> variants=${inventoryPayload.variants.length} total=${inventoryPayload.totalStock}`
      );
    } else {
      try {
        const createdInventory = await Inventory.create({
          productId: productBaseId,
          variants: inventoryPayload.variants,
          totalStock: inventoryPayload.totalStock,
          reservedStock: inventoryPayload.reservedStock,
        });
        await ProductBase.findByIdAndUpdate(productBaseId, {
          inventoryId: createdInventory._id,
        });
        stats.inventories += 1;
      } catch (error) {
        warn(`Failed to create inventory for base ${productBaseId}: ${error.message}`);
      }
    }

    for (const site of SITE_CODES) {
      const name =
        extractLocalizedField(legacy, "name", site) ||
        extractLocalizedField(legacy, "title", site);
      if (!name) {
        stats.missingLocales.push({ legacyId, site });
        continue;
      }
      const description =
        extractLocalizedField(legacy, "description", site) ||
        extractLocalizedField(legacy, "details", site) ||
        "";
      const slugCandidate = extractLocalizedField(legacy, "slug", site) || name;
      const slug = uniqueSlug(site, slugCandidate, slugTracker.productLocales);
      const seo = extractSeo(legacy, site);
      const details = normalizeStringArray(
        legacy[`details_${site}`] || legacy.details || []
      );
      const careInstructions =
        extractLocalizedField(legacy, "careInstructions", site) ||
        String(legacy.careInstructions || "").trim();

      const legacyCategoryId = legacy.category?.toString?.() || null;
      const categoriesForLegacy = legacyCategoryId
        ? categoryMapping.get(legacyCategoryId)
        : null;
      const categoryInfo = categoriesForLegacy ? categoriesForLegacy[site] : null;
      const categoryId = categoryInfo ? categoryInfo.id : null;

      const localePayload = {
        productId: productBaseId,
        siteCode: site,
        name,
        description,
        slug,
        categoryId,
        details,
        careInstructions,
        seo,
      };

      if (DRY_RUN) {
        verbose(`(dry-run) product locale -> ${site} "${name}" slug=${slug}`);
      } else {
        try {
          await ProductLocale.create(localePayload);
          stats.locales += 1;
        } catch (error) {
          warn(
            `Failed to create ProductLocale for legacy ${legacyId} site ${site}: ${error.message}`
          );
        }
      }
    }

    if (!DRY_RUN) {
      await productsCollection.updateOne(
        { _id: legacy._id },
        {
          $set: {
            migratedAt: new Date(),
            migratedSku: baseSku,
            productBaseId,
          },
        }
      );
    }
  }

  log(
    `Product migration finished: ${stats.bases} bases, ${stats.locales} locales, ${stats.inventories} inventories.`
  );
  if (stats.missingLocales.length) {
    warn(
      `Locales missing for ${stats.missingLocales.length} combinations. Check migration report.`
    );
  }
  return stats;
}

async function migrateContactPages() {
  const config = await ContactConfig.findOne({ key: "default" }).lean();
  if (!config) {
    log("Contact page migration skipped (no ContactConfig found).");
    return { upserts: 0 };
  }

  const content = {
    heroTitle: config.heroTitle,
    heroSubtitle: config.heroSubtitle,
    heroImage: config.heroImage || null,
    addressBlock: config.addressBlock || { title: "", lines: [] },
    hoursBlock: config.hoursBlock || { title: "", lines: [] },
    emailBlock: config.emailBlock || { title: "", lines: [] },
    phoneBlock: config.phoneBlock || { title: "", lines: [] },
    formEnabled: config.formEnabled ?? true,
    successMessage: config.successMessage || "",
  };

  let upserts = 0;
  for (const site of SITE_CODES) {
    const existing = await Page.findOne({ siteCode: site, key: "contact" }).lean();
    let currentSlug;
    if (existing?.slug) {
      ensureTracker(slugTracker.pages, site).add(existing.slug);
      currentSlug = existing.slug;
    } else {
      currentSlug = uniqueSlug(site, "contact", slugTracker.pages);
    }

    if (DRY_RUN) {
      verbose(`(dry-run) would upsert Page contact for ${site} slug=${currentSlug}`);
      continue;
    }

    const result = await Page.findOneAndUpdate(
      { siteCode: site, key: "contact" },
      {
        $set: {
          title: `Contact (${site.toUpperCase()})`,
          content,
          slug: currentSlug,
          seo: {
            title: `${content.heroTitle} | ${site.toUpperCase()}`,
            description: content.heroSubtitle || "",
            keywords: ["contact"],
          },
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    if (result) upserts += 1;
  }

  if (!DRY_RUN) {
    await ContactConfig.deleteMany({ key: "default" }).catch(() => {});
  }

  log(`Contact page migration finished (${upserts} tenant pages upserted).`);
  return { upserts };
}

async function migrateContactMessages() {
  const collection = mongoose.connection.collection("contactmessages");
  const legacyMessages = await collection
    .find({ siteCode: { $exists: false } })
    .toArray();

  if (!legacyMessages.length) {
    log("Contact message migration skipped (all records have siteCode).");
    return { updated: 0 };
  }

  let updated = 0;
  for (const message of legacyMessages) {
    const inferredSite =
      SITE_CODES.find((code) => message[`subject_${code}`] || message[`site_${code}`]) ||
      DEFAULT_SITE;
    if (DRY_RUN) {
      verbose(`(dry-run) would update contact message ${message._id} -> ${inferredSite}`);
      continue;
    }
    const result = await ContactMessage.updateOne(
      { _id: message._id },
      { $set: { siteCode: inferredSite } }
    );
    updated += result.modifiedCount || 0;
  }

  log(`Contact message migration finished (${updated} records updated).`);
  return { updated };
}

async function ensureIndexes() {
  await Promise.all([
    Category.init().catch((error) => warn(`Category index init failed: ${error.message}`)),
    ProductBase.init().catch((error) => warn(`ProductBase index init failed: ${error.message}`)),
    ProductLocale.init().catch((error) =>
      warn(`ProductLocale index init failed: ${error.message}`)
    ),
    Inventory.init().catch((error) => warn(`Inventory index init failed: ${error.message}`)),
    Page.init().catch((error) => warn(`Page index init failed: ${error.message}`)),
    ContactMessage.init().catch((error) =>
      warn(`ContactMessage index init failed: ${error.message}`)
    ),
  ]);
}

async function summarize() {
  const [productCount, baseCount, localeCount, categoryCount] = await Promise.all([
    mongoose.connection.collection("products").countDocuments(),
    ProductBase.countDocuments(),
    ProductLocale.countDocuments(),
    Category.countDocuments(),
  ]);
  log(`Summary -> legacy products: ${productCount}, ProductBase: ${baseCount}, ProductLocale: ${localeCount}, Category: ${categoryCount}`);
}

async function main() {
  log(`Starting migration${DRY_RUN ? " (dry-run mode)" : ""}...`);
  await connectDB();
  await primeTrackers();
  await ensureIndexes();

  const categoryResult = await migrateCategories();
  const productResult = await migrateProducts(categoryResult.mapping);
  const contactPageResult = await migrateContactPages();
  const contactMessageResult = await migrateContactMessages();

  await summarize();

  log("Migration steps completed.");
  return {
    categoryResult,
    productResult,
    contactPageResult,
    contactMessageResult,
  };
}

main()
  .then(() => mongoose.disconnect().then(() => log("Disconnected from MongoDB.")))
  .catch((error) => {
    console.error("[migrate:error]", error);
    mongoose.disconnect().finally(() => process.exit(1));
  });
