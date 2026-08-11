const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");

const app = express();

const dotenv = require("dotenv");
const connectDB = require("./connectDB");
const { apiLimiter, authLimiter } = require("./middlewares/rateLimiter");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");
const { logger } = require("./utils/logger");

dotenv.config(); // ✅ LOAD FIRST

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173"
];

app.use(helmet());

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

app.use(morgan("combined", {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(apiLimiter);
app.use(express.json());

connectDB();

const farmerRoute = require("./routes/farmerRoute");
const warehouseRoutes = require("./routes/warehouseRoutes");
const buyerRoute = require("./routes/buyerRoute");
const authRoute = require("./routes/authRoute");
const traceRoute = require("./routes/traceRoute");

app.get("/", (req, res) => {
  res.send("helll");
});

app.use("/api/farmer", farmerRoute);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/buyer", buyerRoute);
app.use("/api/auth", authLimiter, authRoute);
app.use("/api/trace", traceRoute);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
