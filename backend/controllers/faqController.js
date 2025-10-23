// backend/controllers/faqController.js
import FaqPageConfig from "../models/FaqPageConfig.js";

// helpers
function normStr(v, def = "") {
  if (v === undefined || v === null) return def;
  return String(v).trim();
}
function normBool(v, def = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(s)) return true;
    if (["false", "0", "no", "off"].includes(s)) return false;
  }
  return def;
}
function normNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function normList(val) {
  if (!val) return [];
  if (Array.isArray(val))
    return val.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return normList(parsed);
    } catch (_) {}
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// shape (public)
function shapePublic(config) {
  if (!config) return null;
  const sections = (config.sections || [])
    .filter((s) => s?.isActive)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((s) => ({
      id: s._id?.toString(),
      title: s.title,
      subtitle: s.subtitle || "",
      sortOrder: s.sortOrder ?? 0,
      items: (s.items || [])
        .filter((it) => it?.isActive)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((it) => ({
          id: it._id?.toString(),
          question: it.question,
          answer: it.answer,
          sortOrder: it.sortOrder ?? 0,
        })),
    }));

  return {
    id: config._id?.toString(),
    heroTitle: config.heroTitle || "Frequently Asked Questions",
    heroIntro: config.heroIntro || "",
    isActive: !!config.isActive,
    sections,
    seo: {
      title: config.seo?.title || "",
      description: config.seo?.description || "",
      keywords: Array.isArray(config.seo?.keywords) ? config.seo.keywords : [],
    },
    updatedAt: config.updatedAt,
  };
}

// shape (manage/admin) – aktiflik filtrelemeden döner
function shapeManage(config) {
  if (!config) return null;
  return {
    id: config._id?.toString(),
    heroTitle: config.heroTitle || "",
    heroIntro: config.heroIntro || "",
    isActive: !!config.isActive,
    sections: (config.sections || [])
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((s) => ({
        id: s._id?.toString(),
        title: s.title,
        subtitle: s.subtitle || "",
        isActive: !!s.isActive,
        sortOrder: s.sortOrder ?? 0,
        items: (s.items || [])
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((it) => ({
            id: it._id?.toString(),
            question: it.question,
            answer: it.answer,
            isActive: !!it.isActive,
            sortOrder: it.sortOrder ?? 0,
          })),
      })),
    seo: {
      title: config.seo?.title || "",
      description: config.seo?.description || "",
      keywords: Array.isArray(config.seo?.keywords) ? config.seo.keywords : [],
    },
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy ? String(config.updatedBy) : null,
  };
}

// normalize incoming payload for upsert
function sanitizePayload(body = {}) {
  const clean = {};

  clean.heroTitle = normStr(body.heroTitle, "Frequently Asked Questions");
  clean.heroIntro = normStr(body.heroIntro, "");
  clean.isActive = normBool(body.isActive, true);

  // sections
  const rawSections = Array.isArray(body.sections) ? body.sections : [];
  clean.sections = rawSections.map((s) => {
    const sec = {
      title: normStr(s?.title, "Section"),
      subtitle: normStr(s?.subtitle, ""),
      isActive: normBool(s?.isActive, true),
      sortOrder: normNum(s?.sortOrder, 0),
      items: [],
    };
    const rawItems = Array.isArray(s?.items) ? s.items : [];
    sec.items = rawItems
      .map((it) => ({
        question: normStr(it?.question, ""),
        answer: normStr(it?.answer, ""),
        isActive: normBool(it?.isActive, true),
        sortOrder: normNum(it?.sortOrder, 0),
      }))
      .filter((it) => it.question && it.answer); // boşları at
    return sec;
  });

  // seo
  clean.seo = {
    title: normStr(body?.seo?.title || body?.seoTitle, ""),
    description: normStr(body?.seo?.description || body?.seoDescription, ""),
    keywords: normList(body?.seo?.keywords || body?.seoKeywords),
  };

  return clean;
}

/* -------------------- PUBLIC -------------------- */

// GET /api/faq
export async function getFaqPublic(req, res) {
  try {
    const config = await FaqPageConfig.findOne().lean();
    if (!config || !config.isActive) {
      // Boş da dönebilir, 404 de. Burada boş dönelim:
      return res.json({ faq: shapePublic(config) || null });
    }
    res.json({ faq: shapePublic(config) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* -------------------- ADMIN / MANAGE -------------------- */

// GET /api/faq/manage
export async function getFaqManage(req, res) {
  try {
    const config = await FaqPageConfig.findOne().lean();
    res.json({ faq: shapeManage(config) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// PUT /api/faq  (upsert – tek belge)
export async function upsertFaq(req, res) {
  try {
    const payload = sanitizePayload(req.body || {});
    let doc = await FaqPageConfig.findOne();

    if (!doc) {
      doc = await FaqPageConfig.create({ ...payload, updatedBy: req.userId });
    } else {
      doc.heroTitle = payload.heroTitle;
      doc.heroIntro = payload.heroIntro;
      doc.isActive = payload.isActive;
      doc.sections = payload.sections;
      doc.seo = payload.seo;
      doc.updatedBy = req.userId;
      await doc.save();
    }

    const fresh = await FaqPageConfig.findById(doc._id).lean();
    res.json({ faq: shapeManage(fresh) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
