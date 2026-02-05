const mongoose = require("mongoose");

const cropBatchSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
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
      transportMode: {
      type: String,
      enum: ["NORMAL", "COLD_CHAIN"]
      },
      estimatedDistanceKm: Number,
      estimatedTransportCost: Number,
      pickupWindow: {
      from: Date,
      to: Date
    },
      assignedAt: Date
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CropBatch", cropBatchSchema);
