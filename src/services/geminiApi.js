// src/services/geminiApi.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key (ensure it's prefixed with VITE_ for Vite to expose it)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Gemini API Key is not set in environment variables (VITE_GEMINI_API_KEY)");
  // Handle this error appropriately in your app
}

const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// Function to generate content (e.g., a travel plan)
const generateTravelPlan = async (prompt) => {
  if (!API_KEY) {
    return "Error: Gemini API Key not configured.";
  }
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error generating travel plan with Gemini API:", error);
    return "Error generating travel plan. Please try again later.";
  }
};

export { generateTravelPlan };