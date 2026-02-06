const express = require('express')
const app= express()

const dotenv = require("dotenv");
const connectDB = require("./connectDB");

dotenv.config();

connectDB();

const farmerRoute = require('./routes/farmerRoute')
const warehouseRoutes = require("./routes/warehouseRoutes");
const buyerRoute = require("./routes/buyerRoute")

const port=3000
app.use(express.json())

app.get('/',(req,res)=>{
    res.send("helll")
})

app.use('/api/farmer',farmerRoute)
app.use("/api/warehouse", warehouseRoutes);
app.use('/api/buyer', buyerRoute)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});