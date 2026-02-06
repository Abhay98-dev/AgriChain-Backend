// const CropBatch = require("../models/cropBatch");
// const { getBatchEvents } = require("../blockchain/read");

// const traceBatch = async (req, res) => {
//   try {
//     const { batchId } = req.params;

//     /* ---------- VALIDATION ---------- */
//     if (!batchId) {
//       return res.status(400).json({
//         success: false,
//         message: "batchId is required"
//       });
//     }

//     /* ---------- FETCH OFF-CHAIN DATA ---------- */
//     const batch = await CropBatch.findById(batchId);

//     if (!batch) {
//       return res.status(404).json({
//         success: false,
//         message: "Batch not found"
//       });
//     }

//     /* ---------- FETCH ON-CHAIN EVENTS ---------- */
//     const chainEvents = await getBatchEvents(batchId);

//     /* ---------- BUILD TIMELINE ---------- */
//     const timeline = [];

//     // Batch created (always exists off-chain)
//     timeline.push({
//       step: "BATCH_CREATED",
//       source: "OFF_CHAIN",
//       verified: chainEvents.some(e => e.type === "BATCH_CREATED"),
//       timestamp: batch.createdAt
//     });

//     // Logistics
//     if (batch.logistics) {
//       timeline.push({
//         step: "LOGISTICS_STARTED",
//         source: "OFF_CHAIN",
//         verified: chainEvents.some(e => e.type === "LOGISTICS_STARTED"),
//         timestamp: batch.logistics.assignedAt
//       });
//     }

//     // Sold
//     if (batch.status === "SOLD") {
//       timeline.push({
//         step: "BATCH_SOLD",
//         source: "OFF_CHAIN",
//         verified: chainEvents.some(e => e.type === "BATCH_SOLD"),
//         timestamp: batch.buyer?.soldAt
//       });
//     }

//     /* ---------- FINAL RESPONSE ---------- */
//     return res.status(200).json({
//       success: true,
//       batchId,
//       cropType: batch.cropType,
//       status: batch.status,
//       verifiedOnBlockchain: timeline.every(t => t.verified),
//       timeline,
//       blockchainProofs: chainEvents.map(e => ({
//         type: e.type,
//         txHash: e.txHash
//       }))
//     });

//   } catch (error) {
//     console.error("Trace Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch trace data"
//     });
//   }
// };

// module.exports = { traceBatch };