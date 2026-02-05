const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    location: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },

    coldStorageAvailable: {
      type: Boolean,
      default: false
    },

    capacityKg: {
      type: Number,
      required: true
    },

    currentLoadKg: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Warehouse", warehouseSchema);
