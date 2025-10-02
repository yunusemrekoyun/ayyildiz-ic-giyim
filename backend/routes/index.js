import { Router } from "express";
import auth from "./auth.js";
import products from "./products.js";
import categories from "./categories.js";
import media from "./media.js";

const router = Router();

// ileride burada /products, /categories vs. mount edeceğiz
router.get("/health", (req, res) => res.json({ ok: true }));
router.use("/auth", auth);
router.use("/products", products);
router.use("/categories", categories);
router.use("/media", media);

export default router;
