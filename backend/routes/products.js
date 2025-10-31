// backend/routes/products.js
import { Router } from "express";
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { upload } from "../middleware/upload.js"; // ← tek noktadan multer (memoryStorage)

const router = Router();

// Liste
router.get("/", listProducts);

// Oluştur (opsiyonel görsel upload)
router.post("/", upload.array("images", 8), createProduct);

// Detay (id veya slug)
router.get("/:idOrSlug", getProduct);

// Güncelle (opsiyonel görsel ekleme/silme)
router.put("/:idOrSlug", upload.array("images", 8), updateProduct);

// Sil
router.delete("/:idOrSlug", deleteProduct);

export default router;
