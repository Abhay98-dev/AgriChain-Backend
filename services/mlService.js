const axios = require("axios");

const ML_BASE_URL =
  process.env.ML_BASE_URL || "https://agrichain-ml.onrender.com";

/* --------------------------------------------------
   HELPER FUNCTIONS (feature engineering)
-------------------------------------------------- */

const calculateHarvestAgeDays = (harvestDate) => {
  return Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(harvestDate)) / (1000 * 60 * 60 * 24)
    )
  );
};

const mapSpoilageRiskToHistoricalRate = (risk) => {
  if (risk === "low") return 0.05;
  if (risk === "medium") return 0.15;
  if (risk === "high") return 0.30;
  return 0.15;
};

/* --------------------------------------------------
   PREDICT PRICE (MATCHES ML SCHEMA)
   {
     crop_type,
     region,
     demand_tons,
     supply_tons,
     avg_quality_score,
     avg_batch_age_days
   }
-------------------------------------------------- */

const predictPrice = async ({
  cropType,
  quantity,
  harvestDate,
  location
}) => {
  const payload = {
    crop_type: cropType,
    region: location?.district || location?.state || "Unknown",
    demand_tons: Math.max(quantity / 1000, 1), // rough market demand
    supply_tons: Math.max(quantity / 1200, 1), // rough supply estimate
    avg_quality_score: 0.75, // default quality (can improve later)
    avg_batch_age_days: calculateHarvestAgeDays(harvestDate)
  };

  const res = await axios.post(
    `${ML_BASE_URL}/predict/price`,
    payload
  );
  console.log("ML PRICE PAYLOAD:", payload);
  return res.data;
};

/* --------------------------------------------------
   PREDICT DEMAND (MATCHES ML SCHEMA)
   {
     crop_type,
     region
   }
-------------------------------------------------- */

const predictDemand = async ({ cropType, location }) => {
  const payload = {
    crop_type: cropType,
    region: location?.district || location?.state || "Unknown"
  };

  const res = await axios.post(
    `${ML_BASE_URL}/predict/demand`,
    payload
  );
  console.log("ML DEMAND PAYLOAD:", payload);
  return res.data;
};

/* --------------------------------------------------
   PREDICT SPOILAGE (MATCHES ML SCHEMA)
-------------------------------------------------- */

const predictSpoilage = async ({
  cropType,
  harvestDate,
  spoilageRisk,
  coldChain = false,
  transportTimeHours = 6,
  storageDays = 2
}) => {
  const payload = {
    crop_type: cropType,
    harvest_age_days: calculateHarvestAgeDays(harvestDate),
    avg_temperature: 28,      // India avg (can plug weather API later)
    avg_humidity: 70,
    cold_chain: coldChain ? 1 : 0,
    transport_time_hours: transportTimeHours,
    storage_days: storageDays,
    handling_type: "manual",
    historical_spoilage_rate:
      mapSpoilageRiskToHistoricalRate(spoilageRisk)
  };

  const res = await axios.post(
    `${ML_BASE_URL}/predict/spoilage`,
    payload
  );
  console.log("ML SPOILAGE PAYLOAD:", payload);
  return res.data;
};

/* --------------------------------------------------
   PREDICT SHELF LIFE (MATCHES ML SCHEMA)
   {
     crop_type,
     harvest_age_days,
     avg_temperature,
     avg_humidity,
     cold_chain,
     handling_type,
     storage_type
   }
-------------------------------------------------- */

const predictShelfLife = async ({
  cropType,
  harvestDate,
  coldChain = false
}) => {
  const payload = {
    crop_type: cropType,
    harvest_age_days: calculateHarvestAgeDays(harvestDate),
    avg_temperature: 28,
    avg_humidity: 70,
    cold_chain: coldChain ? 1 : 0,
    handling_type: "manual",
    storage_type: coldChain ? "cold_storage" : "ambient"
  };

  const res = await axios.post(
    `${ML_BASE_URL}/predict/shelf-life`,
    payload
  );
    console.log("ML SHELF LIFE PAYLOAD:", payload);
  return res.data;
};

/* --------------------------------------------------
   EXPORTS
-------------------------------------------------- */

module.exports = {
  predictPrice,
  predictDemand,
  predictSpoilage,
  predictShelfLife
};
