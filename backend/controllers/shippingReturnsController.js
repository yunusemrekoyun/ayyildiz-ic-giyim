// backend/controllers/shippingReturnsController.js
import ShippingReturns from "../models/ShippingReturns.js";

/**
 * --- Yardımcılar ---
 */
const ensureArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((i) => String(i ?? ""));
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map((i) => String(i ?? ""));
    } catch {}
    return v.split("\n").map((s) => String(s));
  }
  return [];
};

const sanitizeSection = (s = {}) => {
  const title = String(s?.title ?? "").trim();
  const paragraphs = ensureArray(s?.paragraphs).map((p) => p.trim());
  const list = {
    heading: String(s?.list?.heading ?? "").trim(),
    items: ensureArray(s?.list?.items).map((i) => i.trim()),
  };
  const normalizedList =
    list.heading || (list.items && list.items.length)
      ? list
      : { heading: "", items: [] };
  return { title, paragraphs, list: normalizedList };
};

/**
 * DB'deki eski/yeni şemaları tek bir "frontend-friendly" objeye çevirir.
 * FRONTEND BEKLENTİSİ:
 * {
 *   heroTitle, heroSubtitle,
 *   sections: [{ title, paragraphs[], list: { heading, items[] } }],
 *   sidebar: { quickFacts[], helpBoxHtml },
 *   seo: { title, description, keywords[] },
 *   isActive
 * }
 */
const shapeToPage = (doc) => {
  if (!doc) return null;
  const d = typeof doc.toObject === "function" ? doc.toObject() : doc;

  // Eski alanlardan (heroIntro/quickFacts/sidebarContact) yeni yapıya mapping
  const heroSubtitle = (d.heroSubtitle ?? d.heroIntro ?? "").toString();
  const quickFacts =
    d.sidebar?.quickFacts ??
    d.quickFacts ?? // legacy
    [];
  const helpBoxHtml =
    d.sidebar?.helpBoxHtml ??
    d.sidebarContact?.note ?? // legacy -> note'u HTML kutusu gibi göster
    "";

  return {
    id: d._id?.toString?.() || d.id,
    heroTitle: (d.heroTitle ?? "Shipping & Returns").toString(),
    heroSubtitle,
    sections: Array.isArray(d.sections) ? d.sections : [],
    sidebar: {
      quickFacts: Array.isArray(quickFacts) ? quickFacts : [],
      helpBoxHtml: helpBoxHtml.toString(),
    },
    isActive: d.isActive !== false,
    seo: {
      title: d.seo?.title ?? "",
      description: d.seo?.description ?? "",
      keywords: Array.isArray(d.seo?.keywords) ? d.seo.keywords : [],
    },
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
};

/**
 * --- PUBLIC — GET /api/shipping-returns ---
 * FRONTEND get() => data.page bekliyor
 */
export async function getPublicShippingReturns(req, res) {
  try {
    const doc =
      (await ShippingReturns.findOne({
        singleton: "shipping_returns",
      }).lean()) || null;

    if (!doc || doc.isActive === false) {
      // kayıt yoksa "aktif varsay" + boş güvenli default
      return res.json({
        page: {
          heroTitle: "Shipping & Returns",
          heroSubtitle: "",
          sections: [],
          sidebar: { quickFacts: [], helpBoxHtml: "" },
          isActive: doc ? false : true,
          seo: { title: "", description: "", keywords: [] },
        },
      });
    }

    return res.json({ page: shapeToPage(doc) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * --- ADMIN — GET /api/shipping-returns/manage ---
 * FRONTEND manage() => data.page bekliyor
 */
export async function getManageShippingReturns(req, res) {
  try {
    const doc =
      (await ShippingReturns.findOne({
        singleton: "shipping_returns",
      }).lean()) || null;

    if (!doc) {
      return res.json({
        page: {
          heroTitle: "Shipping & Returns",
          heroSubtitle: "",
          sections: [],
          sidebar: { quickFacts: [], helpBoxHtml: "" },
          isActive: true,
          seo: { title: "", description: "", keywords: [] },
        },
      });
    }

    res.json({ page: shapeToPage(doc) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * --- ADMIN — PUT /api/shipping-returns ---
 * FRONTEND upsert() => data.page bekliyor
 * Payload frontend şemasında gelecek (heroSubtitle + sidebar.quickFacts/helpBoxHtml)
 * fakat DB'de legacy alanlar varsa yine de doğru yazalım (yeni şemaya set edelim).
 */
export async function upsertShippingReturns(req, res) {
  try {
    const payload = req.body || {};

    // Frontend şemasını normalize et
    const heroTitle = String(payload.heroTitle ?? "Shipping & Returns").trim();
    const heroSubtitle = String(payload.heroSubtitle ?? "").trim();

    const rawSections = Array.isArray(payload.sections) ? payload.sections : [];
    const sections = rawSections.map(sanitizeSection);

    // sidebar (yeni)
    const sidebar = {
      quickFacts: ensureArray(payload?.sidebar?.quickFacts).map((i) =>
        String(i).trim()
      ),
      helpBoxHtml: String(payload?.sidebar?.helpBoxHtml ?? "").toString(),
    };

    const isActive =
      typeof payload.isActive === "undefined"
        ? true
        : Boolean(payload.isActive);

    const seo = {
      title: String(payload?.seo?.title ?? "").trim(),
      description: String(payload?.seo?.description ?? "").trim(),
      keywords: ensureArray(payload?.seo?.keywords).map((k) => k.trim()),
    };

    // DB'ye YENİ şema ile yazıyoruz (legacy alanları artık doldurmuyoruz)
    const update = {
      singleton: "shipping_returns",
      heroTitle,
      heroSubtitle,
      sections,
      sidebar,
      isActive,
      seo,
    };

    const doc = await ShippingReturns.findOneAndUpdate(
      { singleton: "shipping_returns" },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ page: shapeToPage(doc) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
