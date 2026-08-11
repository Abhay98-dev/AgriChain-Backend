const { logger } = require("../utils/logger");

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
};

const errorHandler = (err, req, res, next) => {
  logger.error("Unhandled error: %o", err);

  const status = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({
    success: false,
    message
  });
};

module.exports = {
  notFound,
  errorHandler
};
