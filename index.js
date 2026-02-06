const express = require("express");
const app = express();

const dotenv = require("dotenv");
const connectDB = require("./connectDB");
const cors = require("cors");

dotenv.config(); // ✅ LOAD FIRST

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed"), false);
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

connectDB();

app.use(express.json());

const farmerRoute = require("./routes/farmerRoute");
const warehouseRoutes = require("./routes/warehouseRoutes");
const buyerRoute = require("./routes/buyerRoute");

app.get("/", (req, res) => {
  res.send("helll");
});

app.use("/api/farmer", farmerRoute);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/buyer", buyerRoute);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});