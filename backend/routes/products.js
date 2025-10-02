import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import upload from "../middleware/upload.js";
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

const router = Router();

router.get("/", listProducts);
router.get("/:idOrSlug", getProduct);

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  upload.array("images", 8),
  createProduct
);

router.put(
  "/:idOrSlug",
  requireAuth,
  requireRole("admin"),
  upload.array("images", 8),
  updateProduct
);

router.delete(
  "/:idOrSlug",
  requireAuth,
  requireRole("admin"),
  deleteProduct
);

export default router;
