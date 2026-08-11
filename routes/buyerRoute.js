const express = require("express");
const { body, query, param } = require("express-validator");
const router = express.Router();

const {
  getAvailableBatchesForBuyer,
  purchaseBatch,
  getBuyerOrders
} = require("../controller/buyerController");

const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");
const { validateRequest } = require("../middlewares/validationMiddleware");

// /* --------------------------------------------------
//    BUYER REGISTRATION
// -------------------------------------------------- */

// router.post(
//   "/register",
//   authenticate,
//   requireRole("USER"),
//   registerBuyer
// );


/* --------------------------------------------------
   BUYER MARKETPLACE
-------------------------------------------------- */

router.get(
  "/marketplace",
  authenticate,
  requireRole("USER"),
  [
    query("buyerId").optional().isMongoId().withMessage("buyerId must be a valid ID"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100")
  ],
  validateRequest,
  getAvailableBatchesForBuyer
);


/* --------------------------------------------------
   PURCHASE BATCH
-------------------------------------------------- */

router.post(
  "/purchase",
  authenticate,
  requireRole("USER"),
  [
    body("batchId").isMongoId().withMessage("batchId must be a valid ID"),
    body("finalAgreedPrice")
      .isFloat({ gt: 0 })
      .withMessage("finalAgreedPrice must be greater than zero"),
    body("buyerId").optional().isMongoId().withMessage("buyerId must be a valid ID")
  ],
  validateRequest,
  purchaseBatch
);


/* --------------------------------------------------
   BUYER ORDER HISTORY
-------------------------------------------------- */

router.get(
  "/orders/:buyerId",
  authenticate,
  requireRole("USER"),
  [
    param("buyerId").isMongoId().withMessage("buyerId must be a valid ID"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100")
  ],
  validateRequest,
  getBuyerOrders
);

module.exports = router;