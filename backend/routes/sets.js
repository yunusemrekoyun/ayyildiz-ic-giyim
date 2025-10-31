// backend/routes/sets.js
import { Router } from "express";
import multer from "multer";
import {
  createSet,
  listSets,
  getSet,
  updateSet,
  deleteSet,
} from "../controllers/setController.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Liste
router.get("/", listSets);

// Oluştur (opsiyonel görsel upload)
router.post("/", upload.array("images", 8), createSet);

// Detay (id veya slug)
router.get("/:idOrSlug", getSet);

// Güncelle
router.put("/:idOrSlug", upload.array("images", 8), updateSet);

// Sil
router.delete("/:idOrSlug", deleteSet);

export default router;
