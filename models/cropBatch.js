const mongoose = require("mongoose");

const cropBatchSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    cropType: {
      type: String,
      required: true,
      trim: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    unit: {
      type: String,
      required: true,
      enum: ["kg", "quintal"]
    },

    harvestDate: {
      type: Date,
      required: true
    },

    spoilageRisk: {
      type: String,
      required: true,
      enum: ["low", "medium", "high"]
    },

    location: {
      village: String,
      district: String,
      state: String,
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },

    // Lifecycle state (backend-controlled)
    status: {
      type: String,
      enum: [
        "LISTED",      // farmer submitted
        "OFFERED",     // backend generated price
        "ACCEPTED",    // farmer accepted offer
        "REJECTED",    // farmer rejected
        "IN_TRANSIT",  // pickup started
        "STORED",
        "AT_WAREHOUSE",
        "AT_MARKET",
        "SOLD",
        "CLOSED"
      ],
      default: "LISTED",
      index: true
    },

    // Backend decision snapshot (CRITICAL)
    offer: {
      expectedSellingPrice: {
        type: Number
      },
      estimatedDistanceKm: {
        type: Number
      },
      transportCost: {
        type: Number
      },
      storageCost: {
        type: Number
      },
      labourCost: {
        type: Number
      },
      spoilageBuffer: {
        type: Number
      },
      platformMargin: {
        type: Number
      },
      finalFarmerPrice: {
        type: Number,
        index: true
      },
      confidence: {
        type: Number
      },
      generatedAt: {
        type: Date
      }
    },
    logistics: {
      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse"
      },
      transportMode: {
      type: String,
      enum: ["NORMAL", "COLD_CHAIN"]
      },
      estimatedDistanceKm: Number,
      estimatedTravelTimeMin: Number,
      estimatedTransportCost: Number,
      pickupWindow: {
      from: Date,
      to: Date
      },
      assignedAt: Date
    },
    mlInsights: {
      spoilageProbability: Number,
      shelfLifeDays: Number,
      demandScore: Number,
      mlHealth: {
        price: String,
        spoilage: String,
        shelfLife: String,
        demand: String
      }
    },
    aiInsight: {
      type: mongoose.Schema.Types.Mixed
    },
    blockchainBatchId: {
      type: Number,
      index: true,
      unique: true,
      sparse: true
    },

    buyer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    finalSellingPrice: Number,
    soldAt: Date
  }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CropBatch", cropBatchSchema);
