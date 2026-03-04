const CropBatch = require("../models/cropBatch");
const Warehouse = require("../models/warehouse");
const { getGeminiBatchAnalysis } = require("../services/geminiService");
const { getRoadDistanceKm } = require("../utils/RoadDistance");
const { selectBestWarehouse } = require("../utils/selectBestWarehouse");
const { getDistanceKm } = require("../utils/distance");

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

  //  const farmerId = "65f000000000000000000001"; // TODO: replace after auth

    const cropBatch = await CropBatch.create({
      farmerId: req.user.userId,
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

    /* ---------- ESTIMATE TRANSPORT COST ---------- */

    // fetch warehouses
    const warehouses = await Warehouse.find();

    if (!warehouses.length) {
      return res.status(500).json({
      success: false,
      message: "No warehouses available for transport estimation"
      });
    }

    // select best warehouse using existing logic
    const bestWarehouse = selectBestWarehouse(
    { location, spoilageRisk },
    warehouses,
    demandScore
    );

    // estimate distance using haversine
    const estimatedDistance = getDistanceKm(
    location.latitude,
    location.longitude,
    bestWarehouse.location.latitude,
    bestWarehouse.location.longitude
    );

    // logistics cost model
    const costPerKm = 12;
    const baseTruckCost = 150;

    // convert kg → quintal equivalent
    const quantityFactor = quantity / 100;

    // final estimated transport cost
    const transportCost =
      baseTruckCost +
      (estimatedDistance * costPerKm * quantityFactor);
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
      estimatedDistanceKm: Number(estimatedDistance.toFixed(2)),
      transportCost: Number(transportCost.toFixed(2)),
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

    if (cropBatch.farmerId.toString() !== req.user.userId) {
      return res.status(403).json({
      success: false,
      message: "You do not own this crop batch"
    });
    }

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

    if (cropBatch.farmerId.toString() !== req.user.userId) {
      return res.status(403).json({
      success: false,
      message: "You do not own this crop batch"
    });
    }

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

    /* ------------------------------
       STEP 1 : SELECT BEST WAREHOUSE
    ------------------------------ */

    const demandScore =
      cropBatch.aiInsight?.mlOutput?.demandScore || 0.5;

    const bestWarehouse = selectBestWarehouse(
      cropBatch,
      warehouses,
      demandScore
    );

    if (!bestWarehouse) {
      return res.status(500).json({
        success: false,
        message: "No suitable warehouse found"
      });
    }

    /* ------------------------------
       STEP 2 : GET ROAD DISTANCE
    ------------------------------ */

    const roadData = await getRoadDistanceKm(
      cropBatch.location.latitude,
      cropBatch.location.longitude,
      bestWarehouse.location.latitude,
      bestWarehouse.location.longitude
    );

    const roadDistance = roadData.distanceKm;
    const travelTime = roadData.durationMin;

    /* ------------------------------
       STEP 3 : SMART TRANSPORT COST
    ------------------------------ */

    const costPerKm = 12;

    const quantityFactor =
      cropBatch.unit === "quintal"
        ? cropBatch.quantity
        : cropBatch.quantity / 100;

    const transportCost =
      roadDistance * costPerKm * quantityFactor;

    /* ------------------------------
       STEP 4 : SAVE LOGISTICS
    ------------------------------ */

    cropBatch.logistics = {
      warehouseId: bestWarehouse._id,

      transportMode: "NORMAL",

      estimatedDistanceKm: roadDistance,

      estimatedTravelTimeMin: travelTime,

      estimatedTransportCost:
        Number(transportCost.toFixed(2)),

      pickupWindow: {
        from: new Date(Date.now() + 6 * 60 * 60 * 1000),
        to: new Date(Date.now() + 12 * 60 * 60 * 1000)
      },

      assignedAt: new Date()
    };

    cropBatch.status = "IN_TRANSIT";

    await cropBatch.save();

    return res.status(200).json({
      success: true,
      message: "Logistics initiated successfully",
      batchId: cropBatch._id,
      warehouseSelected: bestWarehouse.name,
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



const getMyBatches = async (req, res) => {
  try {
    // 1️⃣ Get farmer ID from authenticated user
    const farmerId = req.user.userId;

    // 2️⃣ Optional status filter
    const { status } = req.query;

    let query = { farmer: farmerId };

    if (status) {
      query.status = status;
    }

    // 3️⃣ Fetch batches created by farmer
    const batches = await CropBatch.find(query)
      .populate("warehouse", "name location latitude longitude coldStorageAvailable")
      .sort({ createdAt: -1 });

    // 4️⃣ Format response data
    const formattedBatches = batches.map((batch) => ({
      batchId: batch._id,

      cropType: batch.cropType,
      quantity: batch.quantity,
      unit: batch.unit,
      harvestDate: batch.harvestDate,

      status: batch.status,

      expectedSellingPrice: batch.expectedSellingPrice,
      finalFarmerPrice: batch.finalFarmerPrice,
      confidenceScore: batch.confidenceScore,

      spoilageProbability: batch.spoilageProbability,
      shelfLifeDays: batch.shelfLifeDays,
      demandScore: batch.demandScore,

      warehouse: batch.warehouse
        ? {
            name: batch.warehouse.name,
            location: batch.warehouse.location,
            latitude: batch.warehouse.latitude,
            longitude: batch.warehouse.longitude,
            coldStorageAvailable: batch.warehouse.coldStorageAvailable,
          }
        : null,

      logistics: batch.logistics
        ? {
            transportMode: batch.logistics.transportMode,
            estimatedDistanceKm: batch.logistics.estimatedDistanceKm,
            estimatedTransportCost: batch.logistics.estimatedTransportCost,
            estimatedTravelTime: batch.logistics.estimatedTravelTime,
          }
        : null,

      createdAt: batch.createdAt,
    }));

    // 5️⃣ Send response
    res.status(200).json({
      success: true,
      count: formattedBatches.length,
      batches: formattedBatches,
    });
  } catch (error) {
    console.error("Error fetching farmer batches:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch crop batches",
      error: error.message,
    });
  }
};


module.exports = {
  createCropBatch,
  acceptOrRejectOffer,
  initiateLogistics,
  getMyBatches
};