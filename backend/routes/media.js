import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  getCloudinaryUsage,
  listCloudinaryResources,
  deleteCloudinaryResource,
} from "../controllers/mediaController.js";

const router = Router();

router.get(
  "/usage",
  requireAuth,
  requireRole("admin"),
  getCloudinaryUsage
);

router.get(
  "/resources",
  requireAuth,
  requireRole("admin"),
  listCloudinaryResources
);

router.delete(
  "/resources/:publicId",
  requireAuth,
  requireRole("admin"),
  deleteCloudinaryResource
);

export default router;
