// backend/routes/stocks.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  listStocks,
  listByOwner,
  upsertStock,
  updateStock,
  deleteStock,
  syncOwnerStocks,
  getStockSummary,
} from "../controllers/stockController.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

/**
 * GET /api/stocks
 *   ?ownerModel=Product|Set
 *   &owner=<ObjectId>
 *   &page=&limit=&search=&isActive=
 */
router.get("/", listStocks);

/**
 * GET /api/stocks/by-owner/:ownerModel/:owner
 *   ownerModel = Product | Set
 *   owner      = ObjectId
 */
router.get("/by-owner/:ownerModel/:owner", listByOwner);

/**
 * GET /api/stocks/summary?ownerModel=&owner=
 *   toplam qtyOnHand döner
 */
router.get("/summary", getStockSummary);

/**
 * POST /api/stocks
 *   upsert (owner+combo’ya göre) — mode: "set" | "inc"
 *   body ör.: {
 *     ownerModel: "Product",
 *     owner: "<productId>",
 *     color: "beige",
 *     size: "M",
 *     attributeValue: "long",
 *     qtyOnHand: 15,         // mode:"set"
 *     // delta: 3            // mode:"inc"
 *     mode: "set"
 *   }
 *
 *   Set için: { ownerModel:"Set", owner:"<setId>", components:[{product,quantity,color,size,attributeValue}], qtyOnHand, ... }
 */
router.post("/", upsertStock);

/**
 * PATCH /api/stocks/:id
 *   kısmi güncelleme (qtyOnHand veya delta ile)
 */
router.patch("/:id", updateStock);

/**
 * DELETE /api/stocks/:id
 */
router.delete("/:id", deleteStock);

/**
 * PUT /api/stocks/sync
 *   Tek owner’ın tüm satırlarını gelen listeyle replace eder.
 *   body: { ownerModel, owner, rows: [{color,size,attributeValue,components,qtyOnHand,sku,isActive,note}] }
 */
router.put("/sync", syncOwnerStocks);

export default router;
