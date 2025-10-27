import { Router } from "express";
import auth from "./auth.js";
import users from "./users.js";
import userDetails from "./userDetails.js";
import ordersRouter from "./orders.js";
import media from "./media.js";
import sets from "./sets.js";
import heroRoutes from "./heroes.js";
import shippingRoutes from "./shipping.js";
import discountRoutes from "./discounts.js";
import couponRoutes from "./coupons.js";
import campaignRoutes from "./campaigns.js";
import reviewRoutes from "./reviews.js";
import aboutRoutes from "./about.js";
import faqRoutes from "./faq.js";
import shippingReturnsRoute from "./shippingReturns.js";
import privacyRoutes from "./privacy.js";
import termsRoutes from "./terms.js";
import themeRoutes from "./theme.js";
import globalProductRoutes from "./global/products.js";
import globalInventoryRoutes from "./global/inventory.js";
import tenantRoutes from "./tenant/index.js";
import { siteCodeResolver } from "../middleware/siteCodeResolver.js";

const router = Router();

router.get("/health", (req, res) => res.json({ ok: true }));
router.use("/auth", auth);

// Global resources
router.use("/global/products", globalProductRoutes);
router.use("/global/inventory", globalInventoryRoutes);
router.use("/users", users);
router.use("/user-details", userDetails);
router.use("/orders", ordersRouter);
router.use("/media", media);
router.use("/sets", sets);
router.use("/heroes", heroRoutes);
router.use("/shipping", shippingRoutes);
router.use("/discounts", discountRoutes);
router.use("/coupons", couponRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/reviews", reviewRoutes);

// Tenant pages & content (multi-site)
router.use(
  "/:siteCode(tr|en|de)",
  siteCodeResolver,
  tenantRoutes
);

// Legacy informational routes (to be migrated to multi-tenant Page model)
router.use("/about", aboutRoutes);
router.use("/faq", faqRoutes);
router.use("/shipping-returns", shippingReturnsRoute);
router.use("/privacy", privacyRoutes);
router.use("/terms", termsRoutes);
router.use("/theme", themeRoutes);

export default router;
