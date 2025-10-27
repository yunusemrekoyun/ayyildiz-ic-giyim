import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.js";
import {
  createProductBase,
  updateProductBase,
} from "../../controllers/global/productBaseController.js";

const router = Router();

router.post("/", requireAdmin, createProductBase);
router.put("/:id", requireAdmin, updateProductBase);

export default router;
