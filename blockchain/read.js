const contract = require("./contract");

const getBatchEvents = async (batchId) => {
  const events = [];

  const harvested = await contract.queryFilter(
    contract.filters.Harvested(batchId)
  );

  const stored = await contract.queryFilter(
    contract.filters.Stored(batchId)
  );

  const transported = await contract.queryFilter(
    contract.filters.Transported(batchId)
  );

  const arrived = await contract.queryFilter(
    contract.filters.ArrivedAtMarket(batchId)
  );

  harvested.forEach(e => events.push({
    type: "BATCH_CREATED",
    txHash: e.transactionHash,
    timestamp: e.args.timestamp?.toString()
  }));

  stored.forEach(e => events.push({
    type: "LOGISTICS_STARTED",
    txHash: e.transactionHash,
    timestamp: e.args.timestamp?.toString()
  }));

  arrived.forEach(e => events.push({
    type: "BATCH_SOLD",
    txHash: e.transactionHash,
    timestamp: e.args.timestamp?.toString()
  }));

  return events;
};

module.exports = { getBatchEvents };