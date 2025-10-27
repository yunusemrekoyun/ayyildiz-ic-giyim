import { Router } from "express";
import {
  submitContactMessage,
  listContactMessages,
  updateContactMessageStatus,
  deleteContactMessage,
} from "../../controllers/tenant/contactMessageController.js";
import { requireAdmin, enforceAllowedSites } from "../../middleware/auth.js";

const router = Router({ mergeParams: true });

router.post("/messages", submitContactMessage);

router.get(
  "/messages",
  requireAdmin,
  enforceAllowedSites,
  listContactMessages
);

router.patch(
  "/messages/:id",
  requireAdmin,
  enforceAllowedSites,
  updateContactMessageStatus
);

router.delete(
  "/messages/:id",
  requireAdmin,
  enforceAllowedSites,
  deleteContactMessage
);

export default router;
