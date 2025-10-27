import { Router } from "express";
import categoriesRouter from "./categories.js";
import productsRouter from "./products.js";
import pagesRouter from "./pages.js";
import contactRouter from "./contact.js";

const router = Router({ mergeParams: true });

router.use("/categories", categoriesRouter);
router.use("/products", productsRouter);
router.use("/pages", pagesRouter);
router.use("/contact", contactRouter);

export default router;
