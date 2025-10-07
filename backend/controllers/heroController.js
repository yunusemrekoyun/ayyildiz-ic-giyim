// backend/controllers/heroController.js
import Hero from "../models/Hero.js";
import Category from "../models/Category.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";
import { configureCloudinary } from "../config/cloudinary.js";

const isValidObjectId = (val) =>
  typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val);

const toPlainImage = (image) =>
  image
    ? {
        url: image.url,
        publicId: image.publicId,
        width: image.width,
        height: image.height,
        format: image.format,
      }
    : null;

const toPlainVideo = (video) =>
  video
    ? {
        url: video.url,
        publicId: video.publicId,
        width: video.width,
        height: video.height,
        duration: video.duration,
        format: video.format,
      }
    : null;

const resolveFolder = () => {
  const instance = configureCloudinary();
  const base = (instance.uploadFolder || "ayyildiz/uploads").replace(
    /\/+$/,
    ""
  );
  return `${base}/heroes`;
};

const shapeHero = (doc) => {
  const id = doc._id;

  // SHOP => /shop, CATEGORIES => /shop?category=<firstId>
  let computedLink = "/shop";
  if (doc.target?.type === "CATEGORIES" && doc.target?.categories?.length) {
    const first = String(doc.target.categories[0]);
    computedLink = `/shop?category=${first}`;
  }

  return {
    id,
    title: doc.title,
    subtitle: doc.subtitle,
    buttonText: doc.buttonText || "",
    image: toPlainImage(doc.image),
    video: toPlainVideo(doc.video),
    target: {
      type: doc.target?.type || "SHOP",
      categories: (doc.target?.categories || []).map(String),
    },
    computedLink,
    isActive: !!doc.isActive,
    sortOrder: Number(doc.sortOrder || 0),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

async function uploadMedia(file) {
  if (!file) return { image: null, video: null };
  const isImage = file.mimetype?.startsWith("image/");
  const isVideo = file.mimetype?.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error("Unsupported media. Only image/* or video/* allowed.");
  }

  const uploadResult = await uploadBufferToCloudinary(file.buffer, {
    folder: resolveFolder(),
    resource_type: isVideo ? "video" : "image",
  });

  if (isImage) {
    return {
      image: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      },
      video: null,
    };
  }
  return {
    image: null,
    video: {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      duration: uploadResult.duration,
      format: uploadResult.format,
    },
  };
}

async function ensureCategoriesExist(ids = []) {
  if (!ids.length) return [];
  const validIds = ids.filter((x) => isValidObjectId(String(x)));
  if (!validIds.length) throw new Error("Invalid category id(s).");
  const count = await Category.countDocuments({ _id: { $in: validIds } });
  if (count !== validIds.length) {
    throw new Error("Some categories do not exist.");
  }
  return validIds;
}

/* --------- CRUD --------- */

export async function createHero(req, res) {
  try {
    const { title, subtitle, buttonText, targetType = "SHOP" } = req.body;

    if (!title || !subtitle) {
      return res
        .status(400)
        .json({ message: "title and subtitle are required" });
    }

    const payload = { type: String(targetType).toUpperCase() };
    if (!["SHOP", "CATEGORIES"].includes(payload.type)) {
      return res.status(400).json({ message: "Invalid target type" });
    }

    if (payload.type === "CATEGORIES") {
      const raw =
        req.body.categories ??
        req.body["target.categories"] ??
        req.body["targetCategories"];
      const arr = Array.isArray(raw)
        ? raw
        : typeof raw === "string"
        ? raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      payload.categories = await ensureCategoriesExist(arr);
      if (!payload.categories.length) {
        return res.status(400).json({
          message: "CATEGORIES target requires at least one id",
        });
      }
    } else {
      payload.categories = [];
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Media file is required (image or video)",
      });
    }
    const { image, video } = await uploadMedia(req.file);

    const hero = await Hero.create({
      title,
      subtitle,
      buttonText: buttonText || "",
      image,
      video,
      target: payload,
      isActive: req.body.isActive === "false" ? false : true,
      sortOrder: Number(req.body.sortOrder || 0),
    });

    res.status(201).json({ hero: shapeHero(hero) });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

export async function listHeroes(req, res) {
  try {
    const includeInactive =
      String(req.query.includeInactive || "").toLowerCase() === "true";
    const filter = includeInactive ? {} : { isActive: true };
    const heroes = await Hero.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    res.json({ heroes: heroes.map(shapeHero) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export async function getHero(req, res) {
  try {
    const { id } = req.params;
    const hero = await Hero.findById(id);
    if (!hero) return res.status(404).json({ message: "Hero not found" });
    res.json({ hero: shapeHero(hero) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export async function updateHero(req, res) {
  try {
    const { id } = req.params;
    const hero = await Hero.findById(id);
    if (!hero) return res.status(404).json({ message: "Hero not found" });

    const { title, subtitle, buttonText, targetType } = req.body;
    if (title !== undefined) hero.title = String(title).trim();
    if (subtitle !== undefined) hero.subtitle = String(subtitle).trim();
    if (buttonText !== undefined) hero.buttonText = String(buttonText);

    if (targetType !== undefined) {
      const t = String(targetType).toUpperCase();
      if (!["SHOP", "CATEGORIES"].includes(t)) {
        return res.status(400).json({ message: "Invalid target type" });
      }
      hero.target.type = t;
      if (t === "SHOP") hero.target.categories = [];
    }

    const rawCats =
      req.body.categories ??
      req.body["target.categories"] ??
      req.body["targetCategories"];
    if (rawCats !== undefined) {
      const arr = Array.isArray(rawCats)
        ? rawCats
        : typeof rawCats === "string"
        ? rawCats
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const valid = await ensureCategoriesExist(arr);
      hero.target.categories = valid;
      if (hero.target.type === "CATEGORIES" && !valid.length) {
        return res.status(400).json({
          message: "CATEGORIES target requires at least one id",
        });
      }
    }

    // Yeni medya geldiyse eskileri doğru resource_type ile sil
    if (req.file) {
      if (hero.image?.publicId) {
        await deleteFromCloudinary(hero.image.publicId, "image").catch(
          () => {}
        );
      }
      if (hero.video?.publicId) {
        await deleteFromCloudinary(hero.video.publicId, "video").catch(
          () => {}
        );
      }
      const { image, video } = await uploadMedia(req.file);
      hero.image = image;
      hero.video = video;
    }

    // Medya kaldırma
    if (req.body.removeMedia === "true") {
      if (hero.image?.publicId) {
        await deleteFromCloudinary(hero.image.publicId, "image").catch(
          () => {}
        );
      }
      if (hero.video?.publicId) {
        await deleteFromCloudinary(hero.video.publicId, "video").catch(
          () => {}
        );
      }
      hero.image = null;
      hero.video = null;
    }

    if (req.body.isActive !== undefined) {
      hero.isActive = String(req.body.isActive).toLowerCase() !== "false";
    }
    if (req.body.sortOrder !== undefined) {
      hero.sortOrder = Number(req.body.sortOrder) || 0;
    }

    await hero.save();
    res.json({ hero: shapeHero(hero) });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

export async function deleteHero(req, res) {
  try {
    const { id } = req.params;
    const hero = await Hero.findById(id);
    if (!hero) return res.status(404).json({ message: "Hero not found" });

    if (hero.image?.publicId) {
      await deleteFromCloudinary(hero.image.publicId, "image").catch(() => {});
    }
    if (hero.video?.publicId) {
      await deleteFromCloudinary(hero.video.publicId, "video").catch(() => {});
    }

    await hero.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

/** Toplu sıralama güncelleme */
export async function reorderHeroes(req, res) {
  try {
    const list = Array.isArray(req.body?.orders) ? req.body.orders : [];
    const ops = list
      .filter((x) => isValidObjectId(String(x?.id)))
      .map((x) => ({
        updateOne: {
          filter: { _id: x.id },
          update: { $set: { sortOrder: Number(x.sortOrder || 0) } },
        },
      }));
    if (ops.length) await Hero.bulkWrite(ops);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}
