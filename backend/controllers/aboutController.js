import About from "../models/About.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";
import { normalizeArray, parseBoolean } from "../utils/productHelpers.js";
import {
  DEFAULT_LANG,
  normalizeLang,
  resolveTranslation,
  pickLocalizedPayload,
  syncDocTranslations,
  composeResponseTranslations,
} from "../utils/i18n.js";

function toPlain(value) {
  if (!value) return {};
  if (typeof value.toObject === "function") return value.toObject();
  return { ...value };
}

function buildAboutTrTranslation(doc) {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const dotBlocks = Array.isArray(plain.dotBlocks) ? plain.dotBlocks : [];
  const stats = Array.isArray(plain.stats) ? plain.stats : [];
  const ctas = Array.isArray(plain.ctas) ? plain.ctas : [];
  return {
    heroTitle: plain.heroTitle ?? "",
    heroSubtitle: plain.heroSubtitle ?? "",
    dotBlocks: dotBlocks.map((block) => ({
      title: block?.title ?? "",
      text: block?.text ?? "",
    })),
    stats: stats.map((stat) => ({
      label: stat?.label ?? "",
    })),
    materialsTitle: plain.materialsTitle ?? "",
    materialsText: plain.materialsText ?? "",
    materialsBullets: Array.isArray(plain.materialsBullets)
      ? [...plain.materialsBullets]
      : [],
    ctaTitle: plain.ctaTitle ?? "",
    ctaSubtitle: plain.ctaSubtitle ?? "",
    ctas: ctas.map((cta) => ({
      text: cta?.text ?? "",
    })),
  };
}

function applyAboutTrTranslationToDoc(doc, translation = {}) {
  if (!translation || typeof translation !== "object") return;

  const assignScalar = (field) => {
    if (translation[field] !== undefined) {
      doc[field] = translation[field];
    }
  };

  [
    "heroTitle",
    "heroSubtitle",
    "materialsTitle",
    "materialsText",
    "ctaTitle",
    "ctaSubtitle",
  ].forEach(assignScalar);

  if (translation.materialsBullets !== undefined) {
    doc.materialsBullets = Array.isArray(translation.materialsBullets)
      ? [...translation.materialsBullets]
      : [];
  }

  if (Array.isArray(translation.dotBlocks)) {
    const current = Array.isArray(doc.dotBlocks) ? doc.dotBlocks : [];
    doc.dotBlocks = current.map((block, index) => {
      const base = toPlain(block);
      const localized = translation.dotBlocks[index] || {};
      return {
        ...base,
        title:
          localized.title !== undefined ? localized.title : base.title ?? "",
        text: localized.text !== undefined ? localized.text : base.text ?? "",
      };
    });
  }

  if (Array.isArray(translation.stats)) {
    const current = Array.isArray(doc.stats) ? doc.stats : [];
    doc.stats = current.map((stat, index) => {
      const base = toPlain(stat);
      const localized = translation.stats[index] || {};
      if (localized.label !== undefined) {
        base.label = localized.label;
      }
      return base;
    });
  }

  if (Array.isArray(translation.ctas)) {
    const current = Array.isArray(doc.ctas) ? doc.ctas : [];
    doc.ctas = current.map((cta, index) => {
      const base = toPlain(cta);
      const localized = translation.ctas[index] || {};
      if (localized.text !== undefined) {
        base.text = localized.text;
      }
      return base;
    });
  }
}

async function getOrCreateAbout() {
  let doc = await About.findOne({ key: "about" });
  if (!doc) {
    doc = await About.create({ key: "about" });
  }
  return doc;
}

function shapeImageResult(cld) {
  if (!cld) return null;
  return {
    url: cld.secure_url,
    publicId: cld.public_id,
    width: cld.width,
    height: cld.height,
    format: cld.format,
  };
}

export async function getAbout(req, res) {
  try {
    const lang = normalizeLang(req.query.lang || DEFAULT_LANG);
    const doc = await getOrCreateAbout();
    const resolved = resolveTranslation(doc, lang);
    resolved.translations = composeResponseTranslations(
      doc,
      buildAboutTrTranslation
    );
    res.json({ about: resolved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateAbout(req, res) {
  try {
    const lang = normalizeLang(req.query.lang || DEFAULT_LANG);
    let doc = await About.findOne({ key: "about" });
    if (!doc) {
      doc = await About.create({ key: "about" });
    }

    const incomingTranslations = pickLocalizedPayload(req.body);
    const trIncoming = incomingTranslations[DEFAULT_LANG];
    if (trIncoming) {
      applyAboutTrTranslationToDoc(doc, trIncoming);
    }

    const fields = [
      "heroTitle",
      "heroSubtitle",
      "materialsTitle",
      "materialsText",
      "ctaTitle",
      "ctaSubtitle",
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        doc[f] = String(req.body[f]);
      }
    });

    if (req.body.dotBlocks !== undefined) {
      let payload = req.body.dotBlocks;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = [];
        }
      }
      if (Array.isArray(payload)) {
        doc.dotBlocks = payload
          .map((b) => ({
            title: String(b?.title || "").trim(),
            text: String(b?.text || "").trim(),
          }))
          .filter((b) => b.title && b.text);
      }
    }

    if (req.body.stats !== undefined) {
      let payload = req.body.stats;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = [];
        }
      }
      if (Array.isArray(payload)) {
        doc.stats = payload
          .map((s) => ({
            value: String(s?.value || "").trim(),
            label: String(s?.label || "").trim(),
          }))
          .filter((s) => s.value && s.label);
      }
    }

    if (req.body.materialsBullets !== undefined) {
      const arr = normalizeArray(req.body.materialsBullets);
      doc.materialsBullets = arr;
    }

    if (req.body.ctas !== undefined) {
      let payload = req.body.ctas;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = [];
        }
      }
      if (Array.isArray(payload)) {
        doc.ctas = payload
          .map((c) => ({
            text: String(c?.text || "").trim(),
            to: String(c?.to || "").trim(),
            variant:
              String(c?.variant || "primary").toLowerCase() === "secondary"
                ? "secondary"
                : "primary",
          }))
          .filter((c) => c.text && c.to);
      }
    }

    const removeHeroImage = parseBoolean(req.body.removeHeroImage, false);
    const removeLeftImage = parseBoolean(req.body.removeLeftImage, false);
    const removeMaterialsImage = parseBoolean(
      req.body.removeMaterialsImage,
      false
    );

    const deletions = [];
    if (removeHeroImage && doc.heroImage?.publicId) {
      deletions.push(deleteFromCloudinary(doc.heroImage.publicId));
      doc.heroImage = null;
    }
    if (removeLeftImage && doc.leftImage?.publicId) {
      deletions.push(deleteFromCloudinary(doc.leftImage.publicId));
      doc.leftImage = null;
    }
    if (removeMaterialsImage && doc.materialsImage?.publicId) {
      deletions.push(deleteFromCloudinary(doc.materialsImage.publicId));
      doc.materialsImage = null;
    }
    if (deletions.length) await Promise.allSettled(deletions);

    const files = req.files || {};
    if (files.heroImage?.[0]?.buffer) {
      const up = await uploadBufferToCloudinary(files.heroImage[0].buffer);
      doc.heroImage = shapeImageResult(up);
    }
    if (files.leftImage?.[0]?.buffer) {
      const up = await uploadBufferToCloudinary(files.leftImage[0].buffer);
      doc.leftImage = shapeImageResult(up);
    }
    if (files.materialsImage?.[0]?.buffer) {
      const up = await uploadBufferToCloudinary(files.materialsImage[0].buffer);
      doc.materialsImage = shapeImageResult(up);
    }

    const finalTranslations = syncDocTranslations(
      doc,
      incomingTranslations,
      buildAboutTrTranslation
    );

    await doc.save();

    const resolved = resolveTranslation(doc, lang);
    resolved.translations = composeResponseTranslations(
      doc,
      buildAboutTrTranslation
    );
    res.json({ about: resolved });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
