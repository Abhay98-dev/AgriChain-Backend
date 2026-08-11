const express = require("express");
const { query, param, body } = require("express-validator");
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
const { requireRole } = require("../middlewares/roleMiddleware");
const { validateRequest } = require("../middlewares/validationMiddleware");

/* --------------------------------------------------
   WAREHOUSE CRUD (ADMIN ONLY)
-------------------------------------------------- */

// Create warehouse
router.post(
  "/create",
  authenticate,
  requireRole("ADMIN"),
  [
    body("name").trim().notEmpty().withMessage("Warehouse name is required"),
    body("location").custom((value, { req }) => {
      if (!value?.latitude && value?.latitude !== 0) {
        throw new Error("location.latitude is required");
      }
      if (!value?.longitude && value?.longitude !== 0) {
        throw new Error("location.longitude is required");
      }
      return true;
    }),
    body("capacityKg")
      .isFloat({ gt: 0 })
      .withMessage("capacityKg must be a positive number")
  ],
  validateRequest,
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
router.get(
  "/all",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100")
  ],
  validateRequest,
  getAllWarehouses
);

/* --------------------------------------------------
   WAREHOUSE OPERATIONS
-------------------------------------------------- */

// Get batches stored in a warehouse
router.get(
  "/:warehouseId/batches",
  authenticate,
  requireRole("ADMIN"),
  [
    param("warehouseId").isMongoId().withMessage("warehouseId must be a valid ID"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100")
  ],
  validateRequest,
  getWarehouseBatches
);

// Get single batch details from warehouse
router.get(
  "/batch/:batchId",
  authenticate,
  requireRole("ADMIN"),
  [param("batchId").isMongoId().withMessage("batchId must be a valid ID")],
  validateRequest,
  getWarehouseBatchById
);

// Mark an in-transit batch as received by its assigned warehouse
router.post(
  "/batch/:batchId/receive",
  authenticate,
  requireRole("ADMIN"),
  [param("batchId").isMongoId().withMessage("batchId must be a valid ID")],
  validateRequest,
  receiveBatchAtWarehouse
);

// Get urgent batches (high spoilage risk)
router.get(
  "/:warehouseId/urgent",
  authenticate,
  requireRole("ADMIN"),
  [
    param("warehouseId").isMongoId().withMessage("warehouseId must be a valid ID"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100")
  ],
  validateRequest,
  getUrgentBatches
);

module.exports = router;
