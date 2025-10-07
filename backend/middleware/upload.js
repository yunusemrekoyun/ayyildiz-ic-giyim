// backend/middleware/upload.js
import multer from "multer";

const storage = multer.memoryStorage();

/** Genel upload (görseller için) – mevcut davranış */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
});

/** HERO için ayrı uploader (video + büyük boyut) */
const HERO_MAX_MB = Number(process.env.HERO_MAX_FILE_MB || 200); // .env ile yönet: HERO_MAX_FILE_MB=200
export const uploadHeroMedia = multer({
  storage,
  limits: {
    fileSize: HERO_MAX_MB * 1024 * 1024, // örn 200MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype?.startsWith("image/") ||
      file.mimetype?.startsWith("video/");
    if (!ok) return cb(new Error("Only image/* or video/* allowed"));
    cb(null, true);
  },
});

export default upload;
