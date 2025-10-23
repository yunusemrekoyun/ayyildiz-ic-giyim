// backend/controllers/privacyController.js
import PrivacyPolicy from "../models/PrivacyPolicy.js";

/* helpers */
const ensureArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x ?? ""));
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x ?? ""));
    } catch {}
    return v.split("\n").map((s) => s);
  }
  return [];
};

const sanitizeSection = (s = {}) => {
  const title = String(s?.title ?? "").trim();
  const id = String(s?.id ?? title).trim();
  const content = ensureArray(s?.content).map((p) => String(p ?? ""));
  return { id, title, content };
};

const shape = (doc) => {
  if (!doc) return null;
  const d = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: d._id?.toString?.() || d.id,
    heroTitle: d.heroTitle || "Privacy Policy",
    heroIntro: d.heroIntro || "",
    sections: Array.isArray(d.sections) ? d.sections : [],
    footerHtml: d.footerHtml || "",
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

/* PUBLIC — GET /api/privacy */
export async function getPublicPrivacy(req, res) {
  try {
    const doc =
      (await PrivacyPolicy.findOne({ singleton: "privacy_policy" }).lean()) ||
      null;

    if (!doc || doc.isActive === false) {
      return res.json({
        privacy: {
          heroTitle: "Privacy Policy",
          heroIntro: "",
          sections: [],
          footerHtml:
            'If you have questions, email <a href="mailto:privacy@evimstil.com" class="text-accent underline">privacy@evimstil.com</a>.',
          isActive: doc ? false : true,
          seo: { title: "", description: "", keywords: [] },
        },
      });
    }

    return res.json({ privacy: shape(doc) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* ADMIN — GET /api/privacy/manage */
export async function getManagePrivacy(req, res) {
  try {
    const doc =
      (await PrivacyPolicy.findOne({ singleton: "privacy_policy" }).lean()) ||
      null;

    if (!doc) {
      return res.json({
        privacy: {
          heroTitle: "Privacy Policy",
          heroIntro: "",
          sections: [],
          footerHtml: "",
          isActive: true,
          seo: { title: "", description: "", keywords: [] },
        },
      });
    }

    res.json({ privacy: shape(doc) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* ADMIN — PUT /api/privacy */
export async function upsertPrivacy(req, res) {
  try {
    const p = req.body || {};
    const heroTitle = String(p.heroTitle ?? "Privacy Policy").trim();
    const heroIntro = String(p.heroIntro ?? "").trim();
    const sectionsRaw = Array.isArray(p.sections) ? p.sections : [];
    const sections = sectionsRaw.map(sanitizeSection);
    const footerHtml = String(p.footerHtml ?? "");
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
      footerHtml,
      isActive,
      seo,
    };

    const doc = await PrivacyPolicy.findOneAndUpdate(
      { singleton: "privacy_policy" },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ privacy: shape(doc) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
