const Buyer = require("../models/buyer");
const CropBatch = require("../models/cropBatch");
const { emitBatchSold } = require("../blockchain/emit");

/* --------------------------------------------------
   REGISTER BUYER
-------------------------------------------------- */

const registerBuyer = async (req, res) => {
  try {
    const {
      name,
      buyerType,
      location,
      contactInfo
    } = req.body;

    /* ---------- VALIDATION ---------- */

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

    /* ---------- CREATE BUYER ---------- */

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
   VIEW AVAILABLE BATCHES (BUYER VIEW)
-------------------------------------------------- */

const getAvailableBatchesForBuyer = async (req, res) => {
  try {
    const batches = await CropBatch.find({
      status: { $in: ["STORED", "IN_TRANSIT"] }
    }).sort({ updatedAt: -1 });

    const formatted = batches.map(batch => ({
      batchId: batch._id,
      cropType: batch.cropType,
      quantity: batch.quantity,
      unit: batch.unit,
      warehouseId: batch.logistics?.warehouseId || null,
      expectedPrice: batch.offer?.expectedSellingPrice || null,
      riskLevel: batch.aiInsight?.warehouseView?.riskLevel || "UNKNOWN",
      sellByDate: batch.aiInsight?.warehouseView?.sellByDate || null
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      batches: formatted
    });

  } catch (error) {
    console.error("Get Buyer Batches Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch available batches"
    });
  }
};

/* --------------------------------------------------
   BUYER PURCHASE BATCH
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

    const cropBatch = await CropBatch.findById(batchId);
    if (!cropBatch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    if (!["STORED", "IN_TRANSIT"].includes(cropBatch.status)) {
      return res.status(400).json({
        success: false,
        message: "Batch is not available for purchase"
      });
    }

    /* ---------- ASSIGN BUYER ---------- */

    cropBatch.buyer = {
      buyerId: buyer._id,
      buyerType: buyer.buyerType,
      finalSellingPrice: finalAgreedPrice,
      soldAt: new Date()
    };

    cropBatch.status = "SOLD";

    await cropBatch.save();

  //  try {
    //  await emitBatchSold(
      //  cropBatch._id.toString(),
       // buyer.buyerType
     // );
   // } catch (chainError) {
    //  console.error("Blockchain emit failed (BatchSold):", chainError.message);
    //}

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
   GET BUYER ORDER HISTORY
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