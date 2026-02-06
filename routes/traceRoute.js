// routes/trace.routes.js
const express = require("express");
const router = express.Router();
const { traceBatch } = require("../controller/traceController");

router.get("/:batchId", traceBatch);

module.exports = router;