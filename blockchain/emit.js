const contract = require("./contract");

/* --------------------------------
   STATE ENUM MAPPING
-------------------------------- */
const STATE = {
  CREATED: 0,
  ACCEPTED: 1,
  IN_TRANSIT: 2,
  SOLD: 3
};

/* --------------------------------
   BATCH CREATED (ON-CHAIN)
-------------------------------- */
const emitBatchCreated = async (cropType, location) => {
  const tx = await contract.createBatch(cropType, location);
  const receipt = await tx.wait();

  // Extract BatchCreated event
  const event = receipt.logs
    .map(log => contract.interface.parseLog(log))
    .find(e => e?.name === "BatchCreated");

  return Number(event.args.batchId);
};
/* --------------------------------
   OFFER ACCEPTED (OPTIONAL)
-------------------------------- */
const emitOfferAccepted = async (batchId) => {
  const tx = await contract.updateState(
    Number(batchId),
    STATE.ACCEPTED
  );
  await tx.wait();
};

/* --------------------------------
   LOGISTICS STARTED
-------------------------------- */
const emitLogisticsStarted = async (batchId) => {
  const tx = await contract.updateState(
    Number(batchId),
    STATE.IN_TRANSIT
  );
  await tx.wait();
};

/* --------------------------------
   BATCH SOLD
-------------------------------- */
const emitBatchSold = async (batchId) => {
  const tx = await contract.updateState(
    Number(batchId),
    STATE.SOLD
  );
  await tx.wait();
};

module.exports = {
  emitBatchCreated,
  emitOfferAccepted,
  emitLogisticsStarted,
  emitBatchSold
};