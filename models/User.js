const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["USER", "ADMIN"],
    default: "USER"
  },

  location: {
    city: String,
    state: String,
    pincode: String,
    latitude: Number,
    longitude: Number
  },

  contactInfo: {
    phone: String,
    businessName: String
  },

  orders: [
    {
      batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CropBatch"
      },
      cropType: String,
      quantity: Number,
      finalPrice: Number,
      purchasedAt: Date
    }
  ]

},
{
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);