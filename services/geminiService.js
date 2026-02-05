const getGeminiLogisticsAdvice = async ({
  cropType,
  spoilageRisk,
  distanceKm
}) => {
  // MOCKED for now – replace with Gemini SDK later
  // IMPORTANT: Gemini suggests, backend decides

  if (spoilageRisk === "high" && distanceKm > 80) {
    return {
      recommendColdChain: true,
      riskNote: "High spoilage risk over long distance"
    };
  }

  return {
    recommendColdChain: false,
    riskNote: "Normal transport sufficient"
  };
};

module.exports = { getGeminiLogisticsAdvice };
