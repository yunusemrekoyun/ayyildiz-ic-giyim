// backend/routes/auth.js
import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh); // cookie'den alıyor
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
