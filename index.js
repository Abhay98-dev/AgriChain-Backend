const express = require('express')
const app= express()

const dotenv = require("dotenv");
const connectDB = require("./connectDB");

dotenv.config();

connectDB();

const farmerRoute = require('./routes/farmerRoute')

const port=3000
app.use(express.json())

app.get('/',(req,res)=>{
    res.send("helll")
})

app.use('/api/farmer',farmerRoute)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});