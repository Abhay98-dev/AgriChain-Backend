const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Gemini is used ONLY for reasoning & explanation.
 * It does NOT make final decisions.
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
  generationConfig: {
    // Ask Gemini for machine-readable output. The cleanup below remains as a
    // fallback because models can still occasionally add Markdown fences.
    responseMimeType: "application/json",
  },
});

/**
 * Removes an optional Markdown code fence before parsing a Gemini response.
 */
const parseGeminiJson = (responseText) => {
  const cleanedResponse = responseText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  return JSON.parse(cleanedResponse);
};

/**
 * AI reasoning for crop batch analysis
 */
const getGeminiBatchAnalysis = async ({
  farmerInput,
  mlOutput,
  marketContext,
}) => {
  try {
    const prompt = `
You are an agricultural supply-chain AI assistant.

IMPORTANT RULES:
- Do NOT change ML predictions
- Do NOT invent prices
- ONLY explain and advise
- Output MUST be valid JSON
- Be clear and practical

FARMER INPUT:
${JSON.stringify(farmerInput, null, 2)}

ML OUTPUT:
${JSON.stringify(mlOutput, null, 2)}

MARKET CONTEXT:
${JSON.stringify(marketContext, null, 2)}

TASK:
1. Validate farmer input vs ML output
2. Explain pricing in simple terms
3. Give spoilage & sell-by advice
4. Respond separately for farmer and warehouse manager

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "farmerView": {
    "summary": "",
    "priceExplanation": "",
    "qualityAssessment": "",
    "recommendations": [],
    "riskWarnings": []
  },
  "warehouseView": {
    "commodityOverview": "",
    "sellByDate": "",
    "storageAdvice": "",
    "sellingStrategy": [],
    "riskLevel": ""
  },
  "confidence": "HIGH | MEDIUM | LOW"
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Gemini may wrap otherwise valid JSON in a ```json Markdown fence.
    const parsedResponse = parseGeminiJson(responseText);

    return parsedResponse;
  } catch (error) {
    console.error("Gemini Service Error:", error.message);

    return {
      error: true,
      message: "AI analysis failed",
    };
  }
};

module.exports = {
  getGeminiBatchAnalysis,
};
