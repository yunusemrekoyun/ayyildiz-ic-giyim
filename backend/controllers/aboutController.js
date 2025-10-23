import About from "../models/About.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";
import { normalizeArray, parseBoolean } from "../utils/productHelpers.js";

/** Singleton belgeyi getir (yoksa oluştur – defaultlarla) */
async function getOrCreateAbout() {
  let doc = await About.findOne({ key: "about" }).lean();
  if (!doc) {
    doc = await About.create({ key: "about" });
    doc = doc.toObject();
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
    const doc = await getOrCreateAbout();
    res.json({ about: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Admin update (PUT/PATCH) – multipart destekler
 * Field isimleri (files):
 *  - heroImage
 *  - leftImage
 *  - materialsImage
 *
 * Opsiyonel silme bayrakları (body):
 *  - removeHeroImage
 *  - removeLeftImage
 *  - removeMaterialsImage
 */
export async function updateAbout(req, res) {
  try {
    let doc = await About.findOne({ key: "about" });
    if (!doc) {
      doc = await About.create({ key: "about" });
    }

    // --- Basit text alanları
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

    // --- Dot blocks (array of {title, text})
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

    // --- Stats (array of {value, label})
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

    // --- Materials bullets (array of string)
    if (req.body.materialsBullets !== undefined) {
      const arr = normalizeArray(req.body.materialsBullets);
      doc.materialsBullets = arr;
    }

    // --- CTAs (array of {text, to, variant})
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

    // ---- IMAGES ----
    const removeHeroImage = parseBoolean(req.body.removeHeroImage, false);
    const removeLeftImage = parseBoolean(req.body.removeLeftImage, false);
    const removeMaterialsImage = parseBoolean(
      req.body.removeMaterialsImage,
      false
    );

    // delete requested images first
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

    // upload new ones if provided
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

    await doc.save();
    res.json({ about: doc.toObject() });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
