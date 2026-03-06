const express = require("express");
const router = express.Router();

const {
  registerBuyer,
  getAvailableBatchesForBuyer,
  purchaseBatch,
  getBuyerOrders
} = require("../controller/buyerController");

const { authenticate } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

/* --------------------------------------------------
   BUYER REGISTRATION
-------------------------------------------------- */

router.post(
  "/register",
  authenticate,
  requireRole("USER"),
  registerBuyer
);


/* --------------------------------------------------
   BUYER MARKETPLACE
-------------------------------------------------- */

router.get(
  "/marketplace",
  authenticate,
  requireRole("USER"),
  getAvailableBatchesForBuyer
);


/* --------------------------------------------------
   PURCHASE BATCH
-------------------------------------------------- */

router.post(
  "/purchase",
  authenticate,
  requireRole("USER"),
  purchaseBatch
);


/* --------------------------------------------------
   BUYER ORDER HISTORY
-------------------------------------------------- */

router.get(
  "/orders/:buyerId",
  authenticate,
  requireRole("USER"),
  getBuyerOrders
);

module.exports = router;