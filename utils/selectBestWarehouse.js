const { getDistanceKm } = require("./distance");

const selectBestWarehouse = (cropBatch, warehouses, demandScore) => {

  let bestWarehouse = null;
  let bestScore = -Infinity;

  for (const warehouse of warehouses) {

    const distance = getDistanceKm(
      cropBatch.location.latitude,
      cropBatch.location.longitude,
      warehouse.location.latitude,
      warehouse.location.longitude
    );

    const distanceScore = 100 - distance;

    const demandWeight = demandScore * 50;

    const coldStorageBonus =
      cropBatch.spoilageRisk === "high" && warehouse.coldStorageAvailable
        ? 30
        : 0;

    const spoilagePriority =
      cropBatch.spoilageRisk === "high"
        ? 20
        : cropBatch.spoilageRisk === "medium"
        ? 10
        : 0;

    const totalScore =
      distanceScore +
      demandWeight +
      coldStorageBonus +
      spoilagePriority;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestWarehouse = warehouse;
    }
  }

  return bestWarehouse;
};

module.exports = { selectBestWarehouse };