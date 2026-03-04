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


router.get("/all", getAllWarehouses);

router.get("/:warehouseId/batches", getWarehouseBatches);


router.get("/batch/:batchId", getWarehouseBatchById);


router.get("/:warehouseId/urgent", getUrgentBatches);

module.exports = router;