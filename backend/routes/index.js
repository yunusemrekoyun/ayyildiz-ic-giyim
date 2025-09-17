import { Router } from "express";
import auth from "./auth.js";

const router = Router();

// ileride burada /products, /categories vs. mount edeceğiz
router.get("/health", (req, res) => res.json({ ok: true }));
router.use("/auth", auth);

export default router;
