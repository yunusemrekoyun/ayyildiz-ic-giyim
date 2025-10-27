import Joi from "joi";
import slugify from "slugify";
import Page from "../../models/Page.js";

const pageKeySchema = Joi.string()
  .pattern(/^[a-z0-9-_]+$/i)
  .min(2)
  .max(64);

const pageBodySchema = Joi.object({
  title: Joi.string().trim().min(1).max(240).required(),
  content: Joi.alternatives()
    .try(Joi.string(), Joi.object())
    .default({}),
  slug: Joi.string().trim().min(1).max(240).optional(),
  seo: Joi.object({
    title: Joi.string().allow("", null),
    description: Joi.string().allow("", null),
    keywords: Joi.alternatives()
      .try(
        Joi.array().items(Joi.string().trim()),
        Joi.string().trim()
      )
      .default([]),
  }).default({}),
});

function normalizeKeywords(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function getPage(req, res) {
  try {
    const { siteCode } = req.tenant;
    const { key } = req.params;

    if (pageKeySchema.validate(key).error) {
      return res.status(400).json({ message: "Invalid page key" });
    }

    const page = await Page.findOne({ siteCode, key }).lean();
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    res.json({ page });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch page" });
  }
}

export async function upsertPage(req, res) {
  try {
    const { siteCode } = req.tenant;
    const { key } = req.params;

    const keyValidation = pageKeySchema.validate(key);
    if (keyValidation.error) {
      return res.status(400).json({ message: "Invalid page key" });
    }

    const payload = await pageBodySchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const slug =
      payload.slug && payload.slug.trim()
        ? slugify(payload.slug, { lower: true, strict: true })
        : slugify(payload.title, { lower: true, strict: true });

    const seo = {
      title: payload.seo?.title || "",
      description: payload.seo?.description || "",
      keywords: normalizeKeywords(payload.seo?.keywords),
    };

    const page = await Page.findOneAndUpdate(
      { siteCode, key },
      {
        $set: {
          title: payload.title,
          content:
            typeof payload.content === "string"
              ? payload.content
              : payload.content ?? {},
          slug,
          seo,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ page });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }
    const status = error.code === 11000 ? 409 : 500;
    res.status(status).json({ message: error.message || "Failed to save page" });
  }
}

export async function listPages(req, res) {
  try {
    const { siteCode } = req.tenant;
    const pages = await Page.find({ siteCode }).sort({ key: 1 }).lean();
    res.json({ pages });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to list pages" });
  }
}
