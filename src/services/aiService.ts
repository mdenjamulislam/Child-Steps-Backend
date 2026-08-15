import type { GuidelineResponse } from "../types";
import { fetchGuidelinesFromAI } from "./guidelinesService";

/**
 * Service to interact with the AI Model to generate personalized guidelines.
 * Delegates to the OpenRouter-backed guidelinesService for live AI responses,
 * with automatic fallback to safe static data if the API call fails.
 */

export const generateParentGuidelines = async (
  ageInMonths: number,
  latestWeight?: number,
  latestHeight?: number
): Promise<GuidelineResponse> => {
  // Use sensible defaults when no growth data is available
  const weight = latestWeight ?? 0;
  const height = latestHeight ?? 0;

  return fetchGuidelinesFromAI(ageInMonths, { weight, height });
};
