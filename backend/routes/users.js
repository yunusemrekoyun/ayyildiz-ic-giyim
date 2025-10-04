import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  getUser,
  listUsers,
  updateUser,
} from "../controllers/userController.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", listUsers);
router.get("/:idOrKey", getUser);
router.patch("/:idOrKey", updateUser);

export default router;
