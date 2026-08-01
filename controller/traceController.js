const CropBatch = require("../models/cropBatch");

const traceBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: "batchId is required"
      });
    }

    const batch = await CropBatch.findById(batchId)
      .populate("farmerId", "name location")
      .populate("logistics.warehouseId", "name location coldStorageAvailable")
      .populate("buyer.userId", "name location");

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found"
      });
    }

    const timeline = [
      {
        step: "BATCH_CREATED",
        source: "OFF_CHAIN",
        verified: false,
        timestamp: batch.createdAt
      }
    ];

    if (batch.offer?.generatedAt) {
      timeline.push({
        step: "OFFER_GENERATED",
        source: "OFF_CHAIN",
        verified: false,
        timestamp: batch.offer.generatedAt
      });
    }

    if (["ACCEPTED", "IN_TRANSIT", "STORED", "AT_WAREHOUSE", "AT_MARKET", "SOLD", "CLOSED"].includes(batch.status)) {
      timeline.push({
        step: "OFFER_ACCEPTED",
        source: "OFF_CHAIN",
        verified: false,
        timestamp: batch.updatedAt
      });
    }

    if (batch.logistics?.assignedAt) {
      timeline.push({
        step: "LOGISTICS_STARTED",
        source: "OFF_CHAIN",
        verified: false,
        timestamp: batch.logistics.assignedAt
      });
    }

    if (batch.buyer?.soldAt) {
      timeline.push({
        step: "BATCH_SOLD",
        source: "OFF_CHAIN",
        verified: false,
        timestamp: batch.buyer.soldAt
      });
    }

    return res.status(200).json({
      success: true,
      batchId: batch._id,
      cropType: batch.cropType,
      quantity: batch.quantity,
      unit: batch.unit,
      quality: batch.quality || null,
      status: batch.status,
      farmer: batch.farmerId || null,
      warehouse: batch.logistics?.warehouseId || null,
      buyer: batch.buyer?.userId || null,
      offer: batch.offer || null,
      logistics: batch.logistics || null,
      aiInsight: batch.aiInsight || null,
      verifiedOnBlockchain: false,
      blockchainEnabled: false,
      timeline
    });
  } catch (error) {
    console.error("Trace Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trace data"
    });
  }
};

module.exports = { traceBatch };
