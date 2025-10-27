import { Router } from "express";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../controllers/tenant/categoryController.js";
import { requireAdmin, enforceAllowedSites } from "../../middleware/auth.js";

const router = Router({ mergeParams: true });

router.get("/", listCategories);
router.get("/:id", getCategory);
router.post("/", requireAdmin, enforceAllowedSites, createCategory);
router.put("/:id", requireAdmin, enforceAllowedSites, updateCategory);
router.delete("/:id", requireAdmin, enforceAllowedSites, deleteCategory);

export default router;
