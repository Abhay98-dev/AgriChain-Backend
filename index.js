const express = require('express')
const app= express()

const dotenv = require("dotenv");
const connectDB = require("./connectDB");
const cors = require("cors");

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, curl)
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

dotenv.config();

connectDB();

const farmerRoute = require('./routes/farmerRoute')
const warehouseRoutes = require("./routes/warehouseRoutes");
const buyerRoute = require("./routes/buyerRoute")
const traceRoute = require("./routes/traceRoute")

const port=3000
app.use(express.json())

app.get('/',(req,res)=>{
    res.send("helll")
})

app.use('/api/farmer',farmerRoute)
app.use("/api/warehouse", warehouseRoutes);
app.use('/api/buyer', buyerRoute)
app.use('/api/trace', traceRoute)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});