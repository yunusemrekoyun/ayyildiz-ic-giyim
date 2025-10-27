import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.js";
import { updateInventory } from "../../controllers/global/inventoryController.js";

const router = Router();

router.put("/:productId", requireAdmin, updateInventory);

export default router;
