// backend/controllers/termsController.js
import Terms from "../models/Terms.js";

const ensureArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x ?? "")).filter(Boolean);
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x ?? "")).filter(Boolean);
      }
    } catch {}
    return v
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const shape = (doc) => {
  if (!doc) return null;
  const d = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: d._id?.toString?.() || d.id,
    heroTitle: d.heroTitle || "Terms of Service",
    heroIntro: d.heroIntro || "",
    sections: Array.isArray(d.sections) ? d.sections : [],
    footerNote: d.footerNote || "", // ← ÖNEMLİ (public/manage dönüşünde var)
    isActive: d.isActive !== false,
    seo: {
      title: d.seo?.title || "",
      description: d.seo?.description || "",
      keywords: Array.isArray(d.seo?.keywords) ? d.seo.keywords : [],
    },
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
};

// PUBLIC — GET /api/terms
export async function getPublicTerms(req, res) {
  try {
    const doc = await Terms.findOne({ singleton: "terms" }).lean();
    if (!doc || doc.isActive === false) {
      return res.json({
        terms: {
          heroTitle: "Terms of Service",
          heroIntro: "",
          sections: [],
          footerNote: "", // ← ÖNEMLİ (public fallback’te de var)
          isActive: doc ? false : true,
          seo: { title: "", description: "", keywords: [] },
        },
      });
    }
    return res.json({ terms: shape(doc) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ADMIN — GET /api/terms/manage
export async function getManageTerms(req, res) {
  try {
    const doc = await Terms.findOne({ singleton: "terms" }).lean();
    if (!doc) {
      return res.json({
        terms: {
          heroTitle: "Terms of Service",
          heroIntro: "",
          sections: [],
          footerNote: "", // ← ÖNEMLİ
          isActive: true,
          seo: { title: "", description: "", keywords: [] },
        },
      });
    }
    res.json({ terms: shape(doc) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ADMIN — PUT /api/terms
export async function upsertTerms(req, res) {
  try {
    const p = req.body || {};
    const heroTitle = String(p.heroTitle ?? "Terms of Service").trim();
    const heroIntro = String(p.heroIntro ?? "").trim();
    const footerNote = String(p.footerNote ?? "").trim(); // ← ÖNEMLİ

    const rawSections = Array.isArray(p.sections) ? p.sections : [];
    const sections = rawSections.map((s) => ({
      title: String(s?.title ?? "").trim(),
      paragraphs: ensureArray(s?.paragraphs),
    }));

    const isActive = p.isActive === undefined ? true : Boolean(p.isActive);
    const seo = {
      title: String(p?.seo?.title ?? "").trim(),
      description: String(p?.seo?.description ?? "").trim(),
      keywords: ensureArray(p?.seo?.keywords),
    };

    const update = {
      heroTitle,
      heroIntro,
      sections,
      footerNote, // ← ÖNEMLİ
      isActive,
      seo,
    };

    const doc = await Terms.findOneAndUpdate(
      { singleton: "terms" },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ terms: shape(doc) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
