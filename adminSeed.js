const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

async function seedAdmin() {

  await mongoose.connect(process.env.MONGO_URI);

  const existingAdmin = await User.findOne({
    email: "admin@agri.com"
  });

  if (existingAdmin) {
    console.log("Admin already exists");
    process.exit();
  }

  const salt = await bcrypt.genSalt(10);

  const passwordHash = await bcrypt.hash("admin123", salt);

  await User.create({
    name: "Platform Admin",
    email: "admin@agri.com",
    passwordHash,
    role: "ADMIN"
  });

  console.log("Admin created successfully");

  process.exit();
}

seedAdmin();