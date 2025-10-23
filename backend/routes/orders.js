import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createOrder,
  myOrders,
  getOrder,
  listOrders,
  adminGetOrder,
  updateOrderStatus,
  createPayPalCheckout,
  capturePayPalCheckout,
} from "../controllers/orderController.js";
import { requireRole } from "../middleware/roles.js";

const router = Router();

router.post("/paypal/create", requireAuth, createPayPalCheckout);
router.post("/paypal/capture", requireAuth, capturePayPalCheckout);
router.post("/", requireAuth, createOrder);
router.get("/mine", requireAuth, myOrders);
router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  listOrders
);
router.get(
  "/admin/:id",
  requireAuth,
  requireRole("admin"),
  adminGetOrder
);
router.patch(
  "/admin/:id/status",
  requireAuth,
  requireRole("admin"),
  updateOrderStatus
);
router.get("/:id", requireAuth, getOrder);

export default router;
