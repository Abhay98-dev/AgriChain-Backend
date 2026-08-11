const Warehouse = require("../models/warehouse");
const CropBatch = require("../models/cropBatch");
const {
  quantityToKg,
  hasWarehouseCapacity,
  increaseWarehouseInventory
} = require("../utils/inventory");
const { getPagination } = require("../utils/pagination");
const { logger } = require("../utils/logger");

const validateQuality = (quality) => {
  if (!quality) {
    return null;
  }

  if (quality.grade && !["A", "B", "C"].includes(quality.grade)) {
    return "Quality grade must be A, B or C";
  }

  if (
    quality.moistureLevel !== undefined &&
    (quality.moistureLevel < 0 || quality.moistureLevel > 100)
  ) {
    return "Moisture level must be between 0 and 100";
  }

  if (
    quality.damagePercentage !== undefined &&
    (quality.damagePercentage < 0 || quality.damagePercentage > 100)
  ) {
    return "Damage percentage must be between 0 and 100";
  }

  if (
    quality.inspectionResult &&
    !["PENDING", "PASSED", "FAILED", "NEEDS_REVIEW"].includes(quality.inspectionResult)
  ) {
    return "Invalid inspection result";
  }

  return null;
};

/* --------------------------------------------------
   GET ALL WAREHOUSES (FOR SELECTION SCREEN)
-------------------------------------------------- */

const getAllWarehouses = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query.page, req.query.limit);
    const warehouses = await Warehouse.find({}, {
      name: 1,
      location: 1,
      coldStorageAvailable: 1,
      capacityKg: 1,
      currentLoadKg: 1,
      inventory: 1
    })
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const totalWarehouses = await Warehouse.countDocuments();

    return res.status(200).json({
      success: true,
      page,
      limit,
      total: totalWarehouses,
      count: warehouses.length,
      warehouses
    });

  } catch (error) {
    logger.error("Get Warehouses Error: %o", error);
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

    const { page, limit, skip } = getPagination(req.query.page, req.query.limit);
    const totalBatches = await CropBatch.countDocuments({
      "logistics.warehouseId": warehouseId
    });

    const batches = await CropBatch.find({
      "logistics.warehouseId": warehouseId
    })
      .sort({ "logistics.assignedAt": -1 })
      .skip(skip)
      .limit(limit);

    const formattedBatches = batches.map(batch => ({
      batchId: batch._id,
      cropType: batch.cropType,
      quantity: batch.quantity,
      unit: batch.unit,
      status: batch.status,
      harvestDate: batch.harvestDate,
      quality: batch.quality || null,
      warehouseId: batch.logistics?.warehouseId || null,
      sellByDate: batch.aiInsight?.warehouseView?.sellByDate || null,
      riskLevel: batch.aiInsight?.warehouseView?.riskLevel || "UNKNOWN",
      aiAdvice: batch.aiInsight?.warehouseView || null
    }));

    return res.status(200).json({
      success: true,
      warehouseId,
      page,
      limit,
      total: totalBatches,
      count: formattedBatches.length,
      batches: formattedBatches
    });

  } catch (error) {
    logger.error("Get Warehouse Batches Error: %o", error);
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
        quality: batch.quality || null,
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

    const { page, limit, skip } = getPagination(req.query.page, req.query.limit);
    const allBatches = await CropBatch.find({
      "logistics.warehouseId": warehouseId
    });

    const urgentBatches = allBatches.filter(batch => {
      const risk = batch.aiInsight?.warehouseView?.riskLevel;
      return risk === "HIGH";
    });

    const pagedUrgentBatches = urgentBatches.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      warehouseId,
      page,
      limit,
      total: urgentBatches.length,
      count: pagedUrgentBatches.length,
      batches: pagedUrgentBatches.map(batch => ({
        batchId: batch._id,
        cropType: batch.cropType,
        quantity: batch.quantity,
        quality: batch.quality || null,
        status: batch.status,
        riskLevel: batch.aiInsight?.warehouseView?.riskLevel,
        sellByDate: batch.aiInsight?.warehouseView?.sellByDate
      }))
    });

  } catch (error) {
    logger.error("Get Urgent Batches Error: %o", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch urgent batches"
    });
  }
};

const createWarehouse = async (req, res) => {
  try {
    const {
      name,
      location,
      latitude,
      longitude,
      coldStorageAvailable,
      capacityKg,
      currentLoadKg
    } = req.body;

    const warehouseLocation = {
      latitude: location?.latitude ?? latitude,
      longitude: location?.longitude ?? longitude
    };

    if (
      !name ||
      warehouseLocation.latitude === undefined ||
      warehouseLocation.longitude === undefined ||
      capacityKg === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "name, location.latitude, location.longitude and capacityKg are required"
      });
    }

    const warehouse = await Warehouse.create({
      name,
      location: warehouseLocation,
      coldStorageAvailable: coldStorageAvailable || false,
      capacityKg,
      currentLoadKg: currentLoadKg || 0,
      inventory: []
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

const receiveBatchAtWarehouse = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { status = "STORED", quality } = req.body;

    if (!["STORED", "AT_WAREHOUSE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be STORED or AT_WAREHOUSE"
      });
    }

    const qualityError = validateQuality(quality);

    if (qualityError) {
      return res.status(400).json({
        success: false,
        message: qualityError
      });
    }

    const batch = await CropBatch.findById(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    if (batch.status !== "IN_TRANSIT") {
      return res.status(400).json({
        success: false,
        message: "Only IN_TRANSIT batches can be received at warehouse"
      });
    }

    const warehouseId = batch.logistics?.warehouseId;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Batch has no assigned warehouse"
      });
    }

    const warehouse = await Warehouse.findById(warehouseId);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Assigned warehouse not found"
      });
    }

    const quantityKg = quantityToKg(batch.quantity, batch.unit);

    if (!hasWarehouseCapacity(warehouse, quantityKg)) {
      return res.status(400).json({
        success: false,
        message: "Warehouse does not have enough remaining capacity"
      });
    }

    if (quality) {
      batch.quality = {
        ...batch.quality?.toObject?.(),
        ...quality,
        inspectedAt: new Date(),
        inspectedBy: req.user.userId
      };
    }

    increaseWarehouseInventory(warehouse, batch.cropType, quantityKg);

    batch.status = status;

    await warehouse.save();
    await batch.save();

    return res.status(200).json({
      success: true,
      message: "Batch received at warehouse successfully",
      batchId: batch._id,
      status: batch.status,
      quality: batch.quality || null,
      warehouse: {
        warehouseId: warehouse._id,
        name: warehouse.name,
        capacityKg: warehouse.capacityKg,
        currentLoadKg: warehouse.currentLoadKg,
        availableCapacityKg: warehouse.capacityKg - warehouse.currentLoadKg,
        inventory: warehouse.inventory
      }
    });
  } catch (error) {
    console.error("Receive Batch Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to receive batch at warehouse"
    });
  }
};

const updateWarehouse = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const updateData = { ...req.body };

    if (req.body.latitude !== undefined) {
      updateData["location.latitude"] = req.body.latitude;
      delete updateData.latitude;
    }

    if (req.body.longitude !== undefined) {
      updateData["location.longitude"] = req.body.longitude;
      delete updateData.longitude;
    }

    const warehouse = await Warehouse.findByIdAndUpdate(
      warehouseId,
      updateData,
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
  receiveBatchAtWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
};
