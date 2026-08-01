const express = require("express");
const router = express.Router();

const {
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getAllWarehouses,
  getWarehouseBatches,
  getWarehouseBatchById,
  getUrgentBatches,
  receiveBatchAtWarehouse
} = require("../controller/warehouseController");

const { authenticate } = require("../middlewares/authMiddleware");
const  {requireRole}  = require("../middlewares/roleMiddleware");

/* --------------------------------------------------
   WAREHOUSE CRUD (ADMIN ONLY)
-------------------------------------------------- */

// Create warehouse
router.post(
  "/create",
  authenticate,
  requireRole("ADMIN"),
  createWarehouse
);

// Update warehouse
router.put(
  "/:warehouseId",
  authenticate,
  requireRole("ADMIN"),
  updateWarehouse
);

// Delete warehouse
router.delete(
  "/:warehouseId",
  authenticate,
  requireRole("ADMIN"),
  deleteWarehouse
);

/* --------------------------------------------------
   WAREHOUSE DATA (PUBLIC / AUTH)
-------------------------------------------------- */

// Get all warehouses (for farmer warehouse selection)
router.get("/all", getAllWarehouses);

/* --------------------------------------------------
   WAREHOUSE OPERATIONS
-------------------------------------------------- */

// Get batches stored in a warehouse
router.get(
  "/:warehouseId/batches",
  authenticate,
  requireRole("ADMIN"),
  getWarehouseBatches
);

// Get single batch details from warehouse
router.get(
  "/batch/:batchId",
  authenticate,
  requireRole("ADMIN"),
  getWarehouseBatchById
);

// Mark an in-transit batch as received by its assigned warehouse
router.post(
  "/batch/:batchId/receive",
  authenticate,
  requireRole("ADMIN"),
  receiveBatchAtWarehouse
);

// Get urgent batches (high spoilage risk)
router.get(
  "/:warehouseId/urgent",
  authenticate,
  requireRole("ADMIN"),
  getUrgentBatches
);

module.exports = router;
