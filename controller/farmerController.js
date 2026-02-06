const CropBatch = require("../models/cropBatch");
const Warehouse = require("../models/warehouse");
const { getDistanceKm } = require("../utils/distance");
const { getGeminiBatchAnalysis } = require("../services/geminiService");
const { emitBatchCreated , emitLogisticsStarted } = require("../blockchain/emit");

const {
  predictPrice,
  predictDemand,
  predictSpoilage,
  predictShelfLife
} = require("../services/mlService");

/* --------------------------------------------------
   CREATE CROP BATCH
-------------------------------------------------- */

const createCropBatch = async (req, res) => {
  try {
    const {
      cropType,
      quantity,
      unit,
      harvestDate,
      spoilageRisk,
      location
    } = req.body;

    /* ---------- VALIDATION ---------- */

    if (
      !cropType ||
      !quantity ||
      !unit ||
      !harvestDate ||
      !spoilageRisk ||
      !location?.latitude ||
      !location?.longitude
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than zero"
      });
    }

    if (!["kg", "quintal"].includes(unit)) {
      return res.status(400).json({
        success: false,
        message: "Invalid unit"
      });
    }

    const harvest = new Date(harvestDate);
    if (harvest > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Harvest date cannot be in the future"
      });
    }

    if (!["low", "medium", "high"].includes(spoilageRisk)) {
      return res.status(400).json({
        success: false,
        message: "Invalid spoilage risk value"
      });
    }

    /* ---------- CREATE BASE BATCH ---------- */

    const farmerId = "65f000000000000000000001"; // TODO: replace after auth

    const cropBatch = await CropBatch.create({
      farmerId,
      cropType,
      quantity,
      unit,
      harvestDate,
      spoilageRisk,
      location,
      status: "LISTED"
    });

    /* ---------- ML INFERENCE (SAFE & PARTIAL) ---------- */

    const results = await Promise.allSettled([
      predictPrice({ cropType, quantity, harvestDate, location }),
      predictSpoilage({ cropType, harvestDate, spoilageRisk }),
      predictShelfLife({ cropType, harvestDate }),
      predictDemand({ cropType, location })
    ]);

    const [priceRes, spoilageRes, shelfLifeRes, demandRes] = results;

    const priceML =
      priceRes.status === "fulfilled" ? priceRes.value : null;

    const spoilageML =
      spoilageRes.status === "fulfilled" ? spoilageRes.value : null;

    const shelfLifeML =
      shelfLifeRes.status === "fulfilled" ? shelfLifeRes.value : null;

    const demandML =
      demandRes.status === "fulfilled" ? demandRes.value : null;

    console.log("ML STATUS:", {
      price: priceRes.status,
      spoilage: spoilageRes.status,
      shelfLife: shelfLifeRes.status,
      demand: demandRes.status
    });

    /* ---------- ML SAFE EXTRACTION ---------- */

    const expectedSellingPrice =
      priceML?.predicted_price ?? quantity * 25;

    const spoilageProbability =
      spoilageML?.spoilage_probability ?? 0.15;

    const shelfLifeDays =
      shelfLifeML?.estimated_days ?? 5;

    const demandScore =
      demandML?.demand_score ?? 0.5;

    /* ---------- COST CALCULATION ---------- */

    const transportCost = quantity * 2;
    const storageCost = quantity * 1.5;
    const labourCost = quantity * 1;

    const spoilageBuffer =
      expectedSellingPrice * spoilageProbability;

    const platformMargin =
      expectedSellingPrice * 0.08;

    const finalFarmerPrice =
      expectedSellingPrice -
      transportCost -
      storageCost -
      labourCost -
      spoilageBuffer -
      platformMargin;

    /* ---------- UPDATE OFFER ---------- */

    cropBatch.offer = {
      expectedSellingPrice,
      transportCost,
      storageCost,
      labourCost,
      spoilageBuffer,
      platformMargin,
      finalFarmerPrice,
      confidence: 1 - spoilageProbability,
      generatedAt: new Date()
    };

    cropBatch.status = "OFFERED";

    /* ---------- GEMINI AI ANALYSIS ---------- */

    let aiInsight = null;

    try {
      const farmerInput = {
        cropType,
        quantity,
        unit,
        harvestDate,
        spoilageRisk,
        location
      };

      const mlOutput = {
        expectedSellingPrice,
        spoilageProbability,
        shelfLifeDays,
        demandScore
      };

      const marketContext = {
        region: "Pune",
        demandLevel: demandScore > 0.6 ? "HIGH" : "MEDIUM"
      };

      aiInsight = await getGeminiBatchAnalysis({
        farmerInput,
        mlOutput,
        marketContext
      });

      cropBatch.aiInsight = aiInsight;
    } catch (aiError) {
      console.error("Gemini AI Failure:", aiError.message);
    }

    await cropBatch.save();

   // try {
     // const blockchainBatchId = await emitBatchCreated(
      //cropType,
     // location.city || location.state || "UNKNOWN"
      //);

    //cropBatch.blockchainBatchId = blockchainBatchId;


   // } catch (chainError) {
     // console.error(
     // "Blockchain emit failed (BatchCreated):",
      //chainError.message
     // );
    //}

    return res.status(201).json({
      success: true,
      message: "Crop listed, offer generated, and AI explanation created",
      batchId: cropBatch._id,
      status: cropBatch.status,
      offer: cropBatch.offer,
      aiInsight: aiInsight?.farmerView || null,
      meta: {
        shelfLifeDays,
        demandScore,
        mlHealth: {
          price: priceRes.status,
          spoilage: spoilageRes.status,
          shelfLife: shelfLifeRes.status,
          demand: demandRes.status
        }
      }
    });

  } catch (error) {
    console.error("Create Crop Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/* --------------------------------------------------
   ACCEPT / REJECT OFFER
-------------------------------------------------- */

const acceptOrRejectOffer = async (req, res) => {
  try {
    const { batchId, action } = req.body;

    if (!batchId || !action) {
      return res.status(400).json({
        success: false,
        message: "batchId and action are required"
      });
    }

    if (!["ACCEPT", "REJECT"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be ACCEPT or REJECT"
      });
    }

    const cropBatch = await CropBatch.findById(batchId);

    if (!cropBatch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    if (cropBatch.status !== "OFFERED") {
      return res.status(400).json({
        success: false,
        message: `Cannot ${action.toLowerCase()} offer in ${cropBatch.status} state`
      });
    }

    cropBatch.status =
      action === "ACCEPT" ? "ACCEPTED" : "REJECTED";

    await cropBatch.save();

    return res.status(200).json({
      success: true,
      message: `Offer ${action.toLowerCase()}ed successfully`,
      batchId: cropBatch._id,
      status: cropBatch.status
    });

  } catch (error) {
    console.error("Offer Action Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/* --------------------------------------------------
   INITIATE LOGISTICS
-------------------------------------------------- */

const initiateLogistics = async (req, res) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: "batchId is required"
      });
    }

    const cropBatch = await CropBatch.findById(batchId);

    if (!cropBatch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    if (cropBatch.status !== "ACCEPTED") {
      return res.status(400).json({
        success: false,
        message: "Logistics can only start after ACCEPTED state"
      });
    }

    const warehouses = await Warehouse.find();
    if (!warehouses.length) {
      return res.status(500).json({
        success: false,
        message: "No warehouses available"
      });
    }

    let nearestWarehouse = null;
    let shortestDistance = Infinity;

    for (const warehouse of warehouses) {
      const distance = getDistanceKm(
        cropBatch.location.latitude,
        cropBatch.location.longitude,
        warehouse.location.latitude,
        warehouse.location.longitude
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestWarehouse = warehouse;
      }
    }

    const transportCost = shortestDistance * 18;

    cropBatch.logistics = {
      warehouseId: nearestWarehouse._id,
      transportMode: "NORMAL",
      estimatedDistanceKm: Number(shortestDistance.toFixed(2)),
      estimatedTransportCost: Number(transportCost.toFixed(2)),
      pickupWindow: {
        from: new Date(Date.now() + 6 * 60 * 60 * 1000),
        to: new Date(Date.now() + 12 * 60 * 60 * 1000)
      },
      assignedAt: new Date()
    };

    cropBatch.status = "IN_TRANSIT";
    await cropBatch.save();

   // try {
    //  await emitLogisticsStarted(
    //    cropBatch.blockchainBatchId
    //  );
   // } catch (chainError) {
    //  console.error("Blockchain emit failed (LogisticsStarted):", chainError.message);
  //  }

    return res.status(200).json({
      success: true,
      message: "Logistics initiated successfully",
      batchId: cropBatch._id,
      logistics: cropBatch.logistics
    });

  } catch (error) {
    console.error("Logistics Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  createCropBatch,
  acceptOrRejectOffer,
  initiateLogistics
};