const Warehouse = require("../models/warehouse");
const CropBatch = require("../models/cropBatch");

/* --------------------------------------------------
   GET ALL WAREHOUSES (FOR SELECTION SCREEN)
-------------------------------------------------- */

const getAllWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find({}, {
      name: 1,
      location: 1,
      coldStorageAvailable: 1
    });

    return res.status(200).json({
      success: true,
      count: warehouses.length,
      warehouses
    });

  } catch (error) {
    console.error("Get Warehouses Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch warehouses"
    });
  }
};

/* --------------------------------------------------
   GET ALL BATCHES FOR A SELECTED WAREHOUSE
-------------------------------------------------- */

const getWarehouseBatches = async (req, res) => {
  try {
    const { warehouseId } = req.params;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "warehouseId is required"
      });
    }

    const batches = await CropBatch.find({
      "logistics.warehouseId": warehouseId
    }).sort({ "logistics.assignedAt": -1 });

    const formattedBatches = batches.map(batch => ({
      batchId: batch._id,
      cropType: batch.cropType,
      quantity: batch.quantity,
      unit: batch.unit,
      status: batch.status,
      harvestDate: batch.harvestDate,
      warehouseId: batch.logistics?.warehouseId || null,
      sellByDate: batch.aiInsight?.warehouseView?.sellByDate || null,
      riskLevel: batch.aiInsight?.warehouseView?.riskLevel || "UNKNOWN",
      aiAdvice: batch.aiInsight?.warehouseView || null
    }));

    return res.status(200).json({
      success: true,
      warehouseId,
      count: formattedBatches.length,
      batches: formattedBatches
    });

  } catch (error) {
    console.error("Get Warehouse Batches Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch warehouse batches"
    });
  }
};

/* --------------------------------------------------
   GET SINGLE BATCH DETAILS (WAREHOUSE VIEW)
-------------------------------------------------- */

const getWarehouseBatchById = async (req, res) => {
  try {
    const { batchId } = req.params;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: "batchId is required"
      });
    }

    const batch = await CropBatch.findById(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    return res.status(200).json({
      success: true,
      batch: {
        batchId: batch._id,
        cropType: batch.cropType,
        quantity: batch.quantity,
        unit: batch.unit,
        status: batch.status,
        harvestDate: batch.harvestDate,
        logistics: batch.logistics,
        offer: batch.offer,
        aiInsight: batch.aiInsight?.warehouseView || null
      }
    });

  } catch (error) {
    console.error("Get Warehouse Batch Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch batch details"
    });
  }
};

/* --------------------------------------------------
   GET URGENT BATCHES (EXPIRING / HIGH RISK)
-------------------------------------------------- */

const getUrgentBatches = async (req, res) => {
  try {
    const { warehouseId } = req.params;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "warehouseId is required"
      });
    }

    const batches = await CropBatch.find({
      "logistics.warehouseId": warehouseId
    });

    const urgentBatches = batches.filter(batch => {
      const risk = batch.aiInsight?.warehouseView?.riskLevel;
      return risk === "HIGH";
    });

    return res.status(200).json({
      success: true,
      warehouseId,
      count: urgentBatches.length,
      batches: urgentBatches.map(batch => ({
        batchId: batch._id,
        cropType: batch.cropType,
        quantity: batch.quantity,
        status: batch.status,
        riskLevel: batch.aiInsight?.warehouseView?.riskLevel,
        sellByDate: batch.aiInsight?.warehouseView?.sellByDate
      }))
    });

  } catch (error) {
    console.error("Get Urgent Batches Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch urgent batches"
    });
  }
};



module.exports = {
  getAllWarehouses,
  getWarehouseBatches,
  getWarehouseBatchById,
  getUrgentBatches,
};