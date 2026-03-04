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

const createWarehouse = async (req, res) => {
  try {
    const { name, location, latitude, longitude, coldStorageAvailable } = req.body;

    if (!name || !location || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "name, location, latitude, longitude are required"
      });
    }

    const warehouse = await Warehouse.create({
      name,
      location,
      latitude,
      longitude,
      coldStorageAvailable: coldStorageAvailable || false
    });

    return res.status(201).json({
      success: true,
      message: "Warehouse created successfully",
      warehouse
    });

  } catch (error) {
    console.error("Create Warehouse Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create warehouse"
    });
  }
};

const updateWarehouse = async (req, res) => {
  try {
    const { warehouseId } = req.params;

    const warehouse = await Warehouse.findByIdAndUpdate(
      warehouseId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Warehouse updated successfully",
      warehouse
    });

  } catch (error) {
    console.error("Update Warehouse Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update warehouse"
    });
  }
};

const deleteWarehouse = async (req, res) => {
  try {
    const { warehouseId } = req.params;

    const warehouse = await Warehouse.findByIdAndDelete(warehouseId);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Warehouse deleted successfully"
    });

  } catch (error) {
    console.error("Delete Warehouse Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete warehouse"
    });
  }
};

module.exports = {
  getAllWarehouses,
  getWarehouseBatches,
  getWarehouseBatchById,
  getUrgentBatches,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
};
