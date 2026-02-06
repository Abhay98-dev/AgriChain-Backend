const mongoose = require("mongoose");

/* --------------------------------------------------
   BUYER ORDER SUB-SCHEMA
-------------------------------------------------- */

const BuyerOrderSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropBatch",
      required: true
    },
    cropType: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    finalPrice: {
      type: Number,
      required: true
    },
    purchasedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

/* --------------------------------------------------
   BUYER SCHEMA
-------------------------------------------------- */

const BuyerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    buyerType: {
      type: String,
      enum: [
        "LOCAL_RETAILER",
        "WHOLESALER",
        "FOOD_PROCESSOR",
        "EXPORTER"
      ],
      required: true
    },

    location: {
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      }
    },

    contactInfo: {
      type: String,
      required: true
    },

    orders: {
      type: [BuyerOrderSchema],
      default: []
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Buyer", BuyerSchema);