import { GoogleGenAI } from '@google/genai';
import { WEATHER_SYSTEM_INSTRUCTION, AI_CONFIG, formatWeatherPrompt } from './promptConfig.js';

const ai = new GoogleGenAI({ apiKey: process.env.LLM_API_KEY });

/**
 * Generates a natural language weather response based on user question and real weather data.
 * @param {string} question - User question (e.g., "Should I carry an umbrella tomorrow?")
 * @param {Object} weatherData - Real weather JSON provided by Person 3
 * @returns {Promise<string>} - The LLM's natural language answer
 */
export async function generateWeatherResponse(question, weatherData) {
  try {
    const userPrompt = formatWeatherPrompt(question, weatherData);

    const response = await ai.models.generateContent({
      model: AI_CONFIG.model,
      contents: userPrompt,
      config: {
        systemInstruction: WEATHER_SYSTEM_INSTRUCTION,
        temperature: AI_CONFIG.temperature,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error generating weather response from LLM:", error);
    throw new Error("Failed to generate weather response due to an AI service error.");
  }
}