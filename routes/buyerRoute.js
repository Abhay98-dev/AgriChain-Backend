const express = require('express')
const router = express.Router()

const {  registerBuyer,
  getAvailableBatchesForBuyer,
  purchaseBatch,
  getBuyerOrders} = require("../controller/buyerController")

router.post("/register", registerBuyer)

router.get("/:buyerId/available-batches", getAvailableBatchesForBuyer)

router.post("/:buyerId/purchase", purchaseBatch)

router.get("/:buyerId/orders", getBuyerOrders)

module.exports = router