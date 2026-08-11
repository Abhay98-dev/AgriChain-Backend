const User = require("../models/User");
const CropBatch = require("../models/cropBatch");
const Warehouse = require("../models/warehouse");

const { getDistanceKm } = require("../utils/distance");
const { getRoadDistanceKm } = require("../utils/RoadDistance");
const {
  quantityToKg,
  decreaseWarehouseInventory
} = require("../utils/inventory");
const { getPagination } = require("../utils/pagination");
const { logger } = require("../utils/logger");


/* --------------------------------------------------
   REGISTER BUYER
-------------------------------------------------- */

// const registerBuyer = async (req, res) => {
//   try {

//     const { name, buyerType, location, contactInfo } = req.body;

//     const ALLOWED_BUYERS = [
//       "LOCAL_RETAILER",
//       "WHOLESALER",
//       "FOOD_PROCESSOR",
//       "EXPORTER"
//     ];

//     if (!name || !buyerType || !location || !contactInfo) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields"
//       });
//     }

//     if (!ALLOWED_BUYERS.includes(buyerType)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid buyer type"
//       });
//     }

//     if (!location.city || !location.state) {
//       return res.status(400).json({
//         success: false,
//         message: "Location must include city and state"
//       });
//     }

//     const buyer = await User.create({
//       name,
//       buyerType,
//       location,
//       contactInfo,
//       createdAt: new Date()
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Buyer registered successfully",
//       buyerId: buyer._id
//     });

//   } catch (error) {

//     console.error("Register Buyer Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Internal server error"
//     });

//   }
// };



/* --------------------------------------------------
   BUYER MARKETPLACE
-------------------------------------------------- */

const getAvailableBatchesForBuyer = async (req, res) => {

  try {

    const { buyerId } = req.query;

    let buyer = null;

    const requesterId = req.user.userId;
    const effectiveBuyerId = buyerId || requesterId;

    if (buyerId && buyerId !== requesterId) {
      return res.status(403).json({
        success: false,
        message: "You cannot view marketplace distance for another user"
      });
    }

    buyer = await User.findById(effectiveBuyerId);

    const batches = await CropBatch.find({
      status: { $in: ["IN_TRANSIT", "STORED", "AT_WAREHOUSE"] }
    }).sort({ updatedAt: -1 });

    const { page, limit, skip } = getPagination(req.query.page, req.query.limit);
    const pagedBatches = batches.slice(skip, skip + limit);
    const formatted = [];

    for (const batch of pagedBatches) {

      const warehouse = await Warehouse.findById(
        batch.logistics?.warehouseId
      );

      let distanceFromBuyer = null;
      let estimatedTravelHours = null;
      let spoilageWarning = null;

      const hasBuyerCoordinates =
        buyer?.location?.latitude !== undefined &&
        buyer?.location?.longitude !== undefined;

      if (buyer && warehouse && hasBuyerCoordinates) {

        const roadData = await getRoadDistanceKm(
          warehouse.location.latitude,
          warehouse.location.longitude,
          buyer.location.latitude,
          buyer.location.longitude
        );

        distanceFromBuyer = roadData.distanceKm;

        estimatedTravelHours =
          roadData.durationMin != null
            ? Number((roadData.durationMin / 60).toFixed(2))
            : null;

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

        quality: batch.quality || null,

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
      page,
      limit,
      total: batches.length,
      count: formatted.length,
      batches: formatted
    });

  } catch (error) {

    logger.error("Get Buyer Marketplace Error: %o", error);

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
    const requesterId = req.user.userId;

    // 1. Basic validation
    if (!batchId || finalAgreedPrice === undefined || finalAgreedPrice === null) {
      return res.status(400).json({
        success: false,
        message: "batchId and finalAgreedPrice are required"
      });
    }

    if (buyerId && buyerId !== requesterId) {
      return res.status(403).json({
        success: false,
        message: "You cannot purchase on behalf of another user"
      });
    }

    // 2. Find buyer (User)
    const buyer = await User.findById(requesterId);

    if (!buyer) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 3. Find batch FIRST (IMPORTANT FIX)
    const cropBatch = await CropBatch.findById(batchId);

    if (!cropBatch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found"
      });
    }

    // 4. Check batch availability
    if (!["STORED", "IN_TRANSIT", "AT_WAREHOUSE"].includes(cropBatch.status)) {
      return res.status(400).json({
        success: false,
        message: "Batch already sold or unavailable"
      });
    }

    // 5. Prevent self-buy (IMPORTANT)
    if (cropBatch.farmerId?.toString() === requesterId) {
      return res.status(400).json({
        success: false,
        message: "You cannot buy your own crop"
      });
    }

    // 6. Validate price BEFORE updating (CRITICAL FIX)
    const minimumPrice = cropBatch.offer?.finalFarmerPrice || 0;

    if (finalAgreedPrice < minimumPrice) {
      return res.status(400).json({
        success: false,
        message: `Price too low. Minimum acceptable price is ₹${minimumPrice}`
      });
    }

    const wasStoredInWarehouse =
      ["STORED", "AT_WAREHOUSE"].includes(cropBatch.status);

    let warehouse = null;

    if (wasStoredInWarehouse && cropBatch.logistics?.warehouseId) {
      warehouse = await Warehouse.findById(cropBatch.logistics.warehouseId);
    }

    // 7. NOW update batch (correct order)
    cropBatch.status = "SOLD";

    cropBatch.buyer = {
      userId: buyer._id, // ✅ FIXED (no buyerType)
      finalSellingPrice: finalAgreedPrice,
      soldAt: new Date()
    };

    if (warehouse) {
      const quantityKg = quantityToKg(cropBatch.quantity, cropBatch.unit);
      decreaseWarehouseInventory(warehouse, cropBatch.cropType, quantityKg);
      await warehouse.save();
    }

    await cropBatch.save();

    // 8. Save order history in User
    buyer.orders.push({
      batchId: cropBatch._id,
      cropType: cropBatch.cropType,
      quantity: cropBatch.quantity,
      finalPrice: finalAgreedPrice,
      purchasedAt: new Date()
    });

    await buyer.save();

    // 9. Response
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
    const requesterId = req.user.userId;

    if (!buyerId) {

      return res.status(400).json({
        success: false,
        message: "buyerId is required"
      });

    }

    if (buyerId !== requesterId) {
      return res.status(403).json({
        success: false,
        message: "You cannot view another user's orders"
      });
    }

    const buyer = await User.findById(buyerId);

    if (!buyer) {

      return res.status(404).json({
        success: false,
        message: "Buyer not found"
      });

    }

    const { page, limit, skip } = getPagination(req.query.page, req.query.limit);
    const orders = buyer.orders || [];
    const pagedOrders = orders.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      buyerId: buyer._id,
      page,
      limit,
      total: orders.length,
      count: pagedOrders.length,
      orders: pagedOrders
    });

  } catch (error) {

    logger.error("Get Buyer Orders Error: %o", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch buyer orders"
    });

  }

};



module.exports = {
  getAvailableBatchesForBuyer,
  purchaseBatch,
  getBuyerOrders
};
