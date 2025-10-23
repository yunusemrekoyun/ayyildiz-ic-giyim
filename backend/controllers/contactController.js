import ContactConfig from "../models/ContactConfig.js";
import ContactMessage from "../models/ContactMessage.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";

// küçük yardımcılar
const parseBool = (v, fb = false) => {
  if (v === undefined || v === null) return fb;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(s)) return true;
    if (["0", "false", "no", "off"].includes(s)) return false;
  }
  return fb;
};
const normalizeLines = (val) => {
  if (!val) return [];
  if (Array.isArray(val))
    return val
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  if (typeof val === "string") {
    try {
      const arr = JSON.parse(val);
      if (Array.isArray(arr))
        return arr
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean);
    } catch {}
    // tek satır girilmişse onu da kabul et
    return [val.trim()].filter(Boolean);
  }
  return [];
};

async function getOrCreateConfig() {
  let cfg = await ContactConfig.findOne({ key: "default" }).lean();
  if (!cfg) {
    cfg = await ContactConfig.create({
      key: "default",
      addressBlock: {
        title: "Visit our European studio",
        lines: [
          "Kurfürstendamm 45, 10719 Berlin",
          "Showroom & click-and-collect (appointment recommended)",
        ],
      },
      hoursBlock: {
        title: "Opening hours (CET)",
        lines: [
          "Mon – Fri: 09:00 – 18:00",
          "Sat: 10:00 – 16:00 (showroom only)",
          "Sun & public holidays: closed",
        ],
      },
      emailBlock: {
        title: "Customer service",
        lines: ["support@evimstil.com", "Average response time: < 24 h"],
      },
      phoneBlock: {
        title: "Phone",
        lines: [
          "+49 (0) 30 234 567 89",
          "WhatsApp & Signal available on the same number",
        ],
      },
    });
    cfg = cfg.toObject();
  }
  return cfg;
}

/** PUBLIC: Contact config getir
 * GET /api/contact
 */
export async function getContact(req, res) {
  try {
    const cfg = await getOrCreateConfig();
    res.json({ contact: cfg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** ADMIN: Contact config güncelle
 * PUT /api/contact
 * Body alanları:
 * - heroTitle, heroSubtitle, formEnabled, successMessage
 * - addressBlock: { title, lines }, hoursBlock, emailBlock, phoneBlock
 * - heroImage: dosya (field name: heroImage) veya {url, publicId} objesi
 */
export async function updateContact(req, res) {
  try {
    const {
      heroTitle,
      heroSubtitle,
      formEnabled,
      successMessage,
      addressBlock,
      hoursBlock,
      emailBlock,
      phoneBlock,
      // alternatif: text JSON olarak da gelebilir
    } = req.body;

    let cfg = await ContactConfig.findOne({ key: "default" });
    if (!cfg) cfg = new ContactConfig({ key: "default" });

    if (heroTitle !== undefined) cfg.heroTitle = String(heroTitle);
    if (heroSubtitle !== undefined) cfg.heroSubtitle = String(heroSubtitle);
    if (successMessage !== undefined)
      cfg.successMessage = String(successMessage);
    if (formEnabled !== undefined)
      cfg.formEnabled = parseBool(formEnabled, cfg.formEnabled);

    // bloklar (hem object hem JSON/string hem de sadece lines/title kabul)
    if (addressBlock !== undefined) {
      const blk =
        typeof addressBlock === "string"
          ? JSON.parse(addressBlock)
          : addressBlock;
      cfg.addressBlock.title = String(
        blk?.title || cfg.addressBlock.title || ""
      );
      cfg.addressBlock.lines = normalizeLines(blk?.lines);
    }
    if (hoursBlock !== undefined) {
      const blk =
        typeof hoursBlock === "string" ? JSON.parse(hoursBlock) : hoursBlock;
      cfg.hoursBlock.title = String(blk?.title || cfg.hoursBlock.title || "");
      cfg.hoursBlock.lines = normalizeLines(blk?.lines);
    }
    if (emailBlock !== undefined) {
      const blk =
        typeof emailBlock === "string" ? JSON.parse(emailBlock) : emailBlock;
      cfg.emailBlock.title = String(blk?.title || cfg.emailBlock.title || "");
      cfg.emailBlock.lines = normalizeLines(blk?.lines);
    }
    if (phoneBlock !== undefined) {
      const blk =
        typeof phoneBlock === "string" ? JSON.parse(phoneBlock) : phoneBlock;
      cfg.phoneBlock.title = String(blk?.title || cfg.phoneBlock.title || "");
      cfg.phoneBlock.lines = normalizeLines(blk?.lines);
    }

    // heroImage upload: ya dosya gelir (upload.single) ya da body’de url/publicId verilir
    if (req.file) {
      // eski görseli sil
      if (cfg.heroImage?.publicId) {
        await deleteFromCloudinary(cfg.heroImage.publicId).catch(() => {});
      }
      const up = await uploadBufferToCloudinary(req.file.buffer);
      cfg.heroImage = {
        url: up.secure_url,
        publicId: up.public_id,
        width: up.width,
        height: up.height,
        format: up.format,
      };
    } else if (req.body.heroImage) {
      const img =
        typeof req.body.heroImage === "string"
          ? JSON.parse(req.body.heroImage)
          : req.body.heroImage;
      cfg.heroImage = {
        url: img?.url || cfg.heroImage?.url || "",
        publicId: img?.publicId || cfg.heroImage?.publicId || "",
        width: img?.width || cfg.heroImage?.width,
        height: img?.height || cfg.heroImage?.height,
        format: img?.format || cfg.heroImage?.format,
      };
    }

    await cfg.save();
    res.json({ contact: cfg.toObject() });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

/** PUBLIC: Form gönder (ContactMessage oluştur)
 * POST /api/contact/messages
 * body: { name, email, phone?, subject, message, hp? }  // hp = honeypot
 */
export async function submitMessage(req, res) {
  try {
    const { name, email, phone = "", subject, message, hp = "" } = req.body;

    // basit honeypot
    if (hp && String(hp).trim() !== "") {
      return res.status(200).json({ ok: true }); // sessizce kabul (spam)
    }

    if (!name || !email || !subject || !message) {
      return res
        .status(400)
        .json({ message: "Please fill in all required fields." });
    }

    const doc = await ContactMessage.create({
      user: req.userId || null,
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone || "").trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
      ip: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || "",
    });

    // Burada (opsiyonel) e-posta bildirimi tetikleyebilirsin.
    // await sendMail(...)

    res.status(201).json({ ok: true, id: doc._id.toString() });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

/** ADMIN: Mesajları listele
 * GET /api/contact/messages?status=new|resolved|all&page=&limit=&search=
 */
export async function listMessages(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const status = String(req.query.status || "all").toLowerCase();
    const search = String(req.query.search || "").trim();

    const filter = {};
    if (status === "new") filter.status = "new";
    else if (status === "resolved") filter.status = "resolved";

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { subject: regex },
        { message: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ContactMessage.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContactMessage.countDocuments(filter),
    ]);

    res.json({
      messages: items.map((m) => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email,
        phone: m.phone,
        subject: m.subject,
        message: m.message,
        status: m.status,
        createdAt: m.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/** ADMIN: Mesaj durum güncelle
 * PATCH /api/contact/messages/:id
 * body: { status: "new" | "resolved" }
 */
export async function updateMessageStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["new", "resolved"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const msg = await ContactMessage.findById(id);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    msg.status = status;
    await msg.save();

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

/** ADMIN: Mesaj sil
 * DELETE /api/contact/messages/:id
 */
export async function deleteMessage(req, res) {
  try {
    const { id } = req.params;
    await ContactMessage.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
