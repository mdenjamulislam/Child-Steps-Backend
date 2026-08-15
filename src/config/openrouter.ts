import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

if (!OPENROUTER_API_KEY) {
  console.warn(
    "⚠️  OPENROUTER_API_KEY is not set. AI features will use fallback data."
  );
}

/**
 * Pre-configured Axios instance for the OpenRouter API.
 * Sets all required headers per https://openrouter.ai/docs
 */
export const openRouterClient = axios.create({
  baseURL: OPENROUTER_BASE_URL,
  timeout: 30_000, // 30 s
  headers: {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
    "X-Title": "Child Development Tracker",
  },
});

/** The model to use for all AI calls (defaults to gemini-2.5-flash). */
export const AI_MODEL =
  process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
