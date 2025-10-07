import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import upload from "../middleware/upload.js";
import {
  listHeroes,
  createHero,
  updateHero,
  deleteHero,
  reorderHeroes,
} from "../controllers/heroController.js";

const router = Router();

router.get("/", listHeroes);

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  upload.single("media"),
  createHero
);

router.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  upload.single("media"),
  updateHero
);

router.delete("/:id", requireAuth, requireRole("admin"), deleteHero);

// sıralama
router.post("/reorder", requireAuth, requireRole("admin"), reorderHeroes);

export default router;
