import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import upload from "../middleware/upload.js";
import {
  createSet,
  listSets,
  getSet,
  updateSet,
  deleteSet,
} from "../controllers/setController.js";

const router = Router();

router.get("/", listSets);
router.get("/:idOrSlug", getSet);

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  upload.array("images", 10),
  createSet
);

router.put(
  "/:idOrSlug",
  requireAuth,
  requireRole("admin"),
  upload.array("images", 10),
  updateSet
);

router.delete(
  "/:idOrSlug",
  requireAuth,
  requireRole("admin"),
  deleteSet
);

export default router;
