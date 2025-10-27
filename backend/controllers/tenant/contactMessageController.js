import Joi from "joi";
import ContactMessage from "../../models/ContactMessage.js";

const messageSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().allow("", null).default(""),
  subject: Joi.string().trim().min(1).max(240).required(),
  message: Joi.string().trim().min(1).max(5000).required(),
  hp: Joi.string().allow("", null).default(""),
});

const statusSchema = Joi.string().valid("new", "resolved").required();

export async function submitContactMessage(req, res) {
  try {
    const { siteCode } = req.tenant;
    const payload = await messageSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (payload.hp && String(payload.hp).trim() !== "") {
      return res.status(200).json({ ok: true });
    }

    const doc = await ContactMessage.create({
      siteCode,
      user: req.userId || null,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || "",
      subject: payload.subject,
      message: payload.message,
      ip: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || "",
    });

    res.status(201).json({ ok: true, id: doc._id.toString() });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }
    res.status(500).json({ message: error.message || "Unable to submit message" });
  }
}

export async function listContactMessages(req, res) {
  try {
    const { siteCode } = req.tenant;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const status = String(req.query.status || "all").toLowerCase();
    const search = String(req.query.search || "").trim();

    const filter = { siteCode };
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
      messages: items.map((item) => ({
        id: item._id.toString(),
        name: item.name,
        email: item.email,
        phone: item.phone,
        subject: item.subject,
        message: item.message,
        status: item.status,
        createdAt: item.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to list messages" });
  }
}

export async function updateContactMessageStatus(req, res) {
  try {
    const { siteCode } = req.tenant;
    const { id } = req.params;
    const nextStatus = await statusSchema.validateAsync(req.body?.status);

    const message = await ContactMessage.findOne({ _id: id, siteCode });
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    message.status = nextStatus;
    await message.save();

    res.json({ ok: true });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    res.status(500).json({ message: error.message || "Unable to update message" });
  }
}

export async function deleteContactMessage(req, res) {
  try {
    const { siteCode } = req.tenant;
    const { id } = req.params;

    const deleted = await ContactMessage.findOneAndDelete({ _id: id, siteCode });
    if (!deleted) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to delete message" });
  }
}
