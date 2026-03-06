const Buyer = require("../models/buyer");
const CropBatch = require("../models/cropBatch");
const Warehouse = require("../models/warehouse");

const { getDistanceKm } = require("../utils/distance");
const { getRoadDistanceKm } = require("../utils/RoadDistance");


/* --------------------------------------------------
   REGISTER BUYER
-------------------------------------------------- */

const registerBuyer = async (req, res) => {
  try {

    const { name, buyerType, location, contactInfo } = req.body;

    const ALLOWED_BUYERS = [
      "LOCAL_RETAILER",
      "WHOLESALER",
      "FOOD_PROCESSOR",
      "EXPORTER"
    ];

    if (!name || !buyerType || !location || !contactInfo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    if (!ALLOWED_BUYERS.includes(buyerType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid buyer type"
      });
    }

    if (!location.city || !location.state) {
      return res.status(400).json({
        success: false,
        message: "Location must include city and state"
      });
    }

    const buyer = await Buyer.create({
      name,
      buyerType,
      location,
      contactInfo,
      createdAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: "Buyer registered successfully",
      buyerId: buyer._id
    });

  } catch (error) {

    console.error("Register Buyer Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });

  }
};



/* --------------------------------------------------
   BUYER MARKETPLACE
-------------------------------------------------- */

const getAvailableBatchesForBuyer = async (req, res) => {

  try {

    const { buyerId } = req.query;

    let buyer = null;

    if (buyerId) {
      buyer = await Buyer.findById(buyerId);
    }

    const batches = await CropBatch.find({
      status: { $in: ["IN_TRANSIT", "STORED"] }
    }).sort({ updatedAt: -1 });

    const formatted = [];

    for (const batch of batches) {

      const warehouse = await Warehouse.findById(
        batch.logistics?.warehouseId
      );

      let distanceFromBuyer = null;
      let estimatedTravelHours = null;
      let spoilageWarning = null;

      if (buyer && warehouse) {

        const roadData = await getRoadDistanceKm(
          warehouse.latitude,
          warehouse.longitude,
          buyer.location.latitude,
          buyer.location.longitude
        );

        distanceFromBuyer = roadData.distanceKm;

        estimatedTravelHours = roadData.durationHours;

        const sellByDate = batch.aiInsight?.warehouseView?.sellByDate;

        if (sellByDate) {

          const now = new Date();

          const hoursRemaining =
            (new Date(sellByDate) - now) / (1000 * 60 * 60);

          if (estimatedTravelHours > hoursRemaining) {

            spoilageWarning = {
              warning: true,
              message: "⚠ Crop may spoil before reaching your location"
            };

          } else {

            spoilageWarning = {
              warning: false
            };

          }

        }

      }

      formatted.push({

        batchId: batch._id,

        cropType: batch.cropType,

        quantity: batch.quantity,

        unit: batch.unit,

        warehouseId: warehouse?._id || null,

        warehouseName: warehouse?.name || "Unknown",

        expectedPrice: batch.offer?.expectedSellingPrice || null,

        riskLevel: batch.aiInsight?.warehouseView?.riskLevel || "UNKNOWN",

        sellByDate: batch.aiInsight?.warehouseView?.sellByDate || null,

        distanceFromBuyerKm: distanceFromBuyer
          ? Number(distanceFromBuyer.toFixed(2))
          : null,

        estimatedDeliveryHours: estimatedTravelHours,

        spoilageWarning: spoilageWarning

      });

    }

    return res.status(200).json({
      success: true,
      count: formatted.length,
      batches: formatted
    });

  } catch (error) {

    console.error("Get Buyer Marketplace Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch marketplace batches"
    });

  }

};



/* --------------------------------------------------
   PURCHASE BATCH
-------------------------------------------------- */

const purchaseBatch = async (req, res) => {

  try {

    const { buyerId, batchId, finalAgreedPrice } = req.body;

    if (!buyerId || !batchId || !finalAgreedPrice) {

      return res.status(400).json({
        success: false,
        message: "buyerId, batchId and finalAgreedPrice are required"
      });

    }

    const buyer = await Buyer.findById(buyerId);

    if (!buyer) {

      return res.status(404).json({
        success: false,
        message: "Buyer not found"
      });

    }

    /* ---------- ATOMIC PURCHASE ---------- */

    const cropBatch = await CropBatch.findOneAndUpdate(

      {
        _id: batchId,
        status: { $in: ["STORED", "IN_TRANSIT"] }
      },

      {
        $set: {
          status: "SOLD",
          buyer: {
            buyerId: buyer._id,
            buyerType: buyer.buyerType,
            finalSellingPrice: finalAgreedPrice,
            soldAt: new Date()
          }
        }
      },

      { new: true }

    );

    if (!cropBatch) {

      return res.status(400).json({
        success: false,
        message: "Batch already sold or unavailable"
      });

    }

    /* ---------- PRICE VALIDATION ---------- */

    const minimumPrice = cropBatch.offer?.finalFarmerPrice || 0;

    if (finalAgreedPrice < minimumPrice) {

      return res.status(400).json({
        success: false,
        message: `Price too low. Minimum acceptable price is ₹${minimumPrice}`
      });

    }

    /* ---------- SAVE ORDER HISTORY ---------- */

    buyer.orders.push({

      batchId: cropBatch._id,
      cropType: cropBatch.cropType,
      quantity: cropBatch.quantity,
      finalPrice: finalAgreedPrice,
      purchasedAt: new Date()

    });

    await buyer.save();

    return res.status(200).json({

      success: true,
      message: "Batch purchased successfully",
      batchId: cropBatch._id,
      buyerId: buyer._id,
      status: cropBatch.status

    });

  } catch (error) {

    console.error("Purchase Batch Error:", error);

    return res.status(500).json({

      success: false,
      message: "Internal server error"

    });

  }

};



/* --------------------------------------------------
   BUYER ORDER HISTORY
-------------------------------------------------- */

const getBuyerOrders = async (req, res) => {

  try {

    const { buyerId } = req.params;

    if (!buyerId) {

      return res.status(400).json({
        success: false,
        message: "buyerId is required"
      });

    }

    const buyer = await Buyer.findById(buyerId);

    if (!buyer) {

      return res.status(404).json({
        success: false,
        message: "Buyer not found"
      });

    }

    return res.status(200).json({

      success: true,
      buyerId: buyer._id,
      orders: buyer.orders || []

    });

  } catch (error) {

    console.error("Get Buyer Orders Error:", error);

    return res.status(500).json({

      success: false,
      message: "Failed to fetch buyer orders"

    });

  }

};



module.exports = {
  registerBuyer,
  getAvailableBatchesForBuyer,
  purchaseBatch,
  getBuyerOrders
};