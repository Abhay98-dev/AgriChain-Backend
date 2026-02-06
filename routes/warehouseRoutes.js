const express = require("express");
const router = express.Router();

const {
  getAllWarehouses,
  getWarehouseBatches,
  getWarehouseBatchById,
  getUrgentBatches
} = require("../controller/warehouseController");

/* --------------------------------------------------
   WAREHOUSE ROUTES
-------------------------------------------------- */

/**
 * GET all warehouses (for selection screen)
 * Example: GET /warehouse/all
 */
router.get("/all", getAllWarehouses);

/**
 * GET all batches for a selected warehouse
 * Example: GET /warehouse/:warehouseId/batches
 */
router.get("/:warehouseId/batches", getWarehouseBatches);

/**
 * GET single batch details (warehouse view)
 * Example: GET /warehouse/batch/:batchId
 */
router.get("/batch/:batchId", getWarehouseBatchById);

/**
 * GET urgent batches for a warehouse
 * Example: GET /warehouse/:warehouseId/urgent
 */
router.get("/:warehouseId/urgent", getUrgentBatches);

module.exports = router;