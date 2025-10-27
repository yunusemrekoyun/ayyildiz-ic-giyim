import { Router } from "express";
import {
  listLocalizedProducts,
  getLocalizedProduct,
  upsertProductLocale,
} from "../../controllers/tenant/productLocaleController.js";
import {
  createTenantProduct,
  updateTenantProduct,
  deleteTenantProduct,
} from "../../controllers/tenant/productManagementController.js";
import { requireAdmin, enforceAllowedSites } from "../../middleware/auth.js";
import upload from "../../middleware/upload.js";

const router = Router({ mergeParams: true });

router.get("/", listLocalizedProducts);
router.get("/:slug", getLocalizedProduct);
router.post(
  "/",
  requireAdmin,
  enforceAllowedSites,
  upload.array("images", 12),
  createTenantProduct
);
router.put(
  "/:id",
  requireAdmin,
  enforceAllowedSites,
  upload.array("images", 12),
  updateTenantProduct
);
router.delete(
  "/:id",
  requireAdmin,
  enforceAllowedSites,
  deleteTenantProduct
);
router.post(
  "/:productId/locale",
  requireAdmin,
  enforceAllowedSites,
  upsertProductLocale
);

export default router;
