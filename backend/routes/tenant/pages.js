import { Router } from "express";
import {
  getPage,
  upsertPage,
  listPages,
} from "../../controllers/tenant/pageController.js";
import { requireAdmin, enforceAllowedSites } from "../../middleware/auth.js";

const router = Router({ mergeParams: true });

router.get("/", listPages);
router.get("/:key", getPage);
router.put("/:key", requireAdmin, enforceAllowedSites, upsertPage);

export default router;
