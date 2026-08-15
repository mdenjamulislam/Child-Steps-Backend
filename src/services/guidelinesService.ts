import { openRouterClient, AI_MODEL } from "../config/openrouter";
import type { GuidelineResponse } from "../types";

// ── Fallback data returned on any API failure ────────────────────────────────

const FALLBACK_GUIDELINES: GuidelineResponse = {
  nutrition: [
    "Offer a variety of fruits, vegetables, whole grains, and proteins.",
    "Limit processed foods, added sugars, and excessive salt.",
    "Ensure adequate hydration with water as the primary drink.",
  ],
  physical_activity: [
    "Provide age-appropriate opportunities for active play every day.",
    "Limit sedentary screen time and encourage movement breaks.",
    "Engage in outdoor activities to support gross motor development.",
  ],
  cognitive_focus: [
    "Read together daily to build language and literacy skills.",
    "Encourage curiosity through open-ended questions and exploration.",
    "Provide hands-on, creative activities like drawing and building.",
  ],
  sleep_recommendations: [
    "Maintain a consistent, calming bedtime routine.",
    "Ensure the sleep environment is dark, quiet, and comfortable.",
    "Follow age-appropriate sleep hour recommendations from your pediatrician.",
  ],
};

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return (
    "You are a pediatric health and development expert. " +
    "When given a child's age, weight, and height, you provide concise, " +
    "evidence-based parenting guidelines tailored to that child's stage of development. " +
    "You ALWAYS respond with ONLY a valid JSON object — no markdown fences, no extra text."
  );
}

function buildUserPrompt(
  ageInMonths: number,
  context: { weight: number; height: number }
): string {
  const years = Math.floor(ageInMonths / 12);
  const months = ageInMonths % 12;
  const ageLabel =
    years > 0 ? `${years} year(s) and ${months} month(s)` : `${months} month(s)`;

  return `Generate personalized child development guidelines for a child who is:
- Age: ${ageLabel} old (${ageInMonths} months)
- Weight: ${context.weight} kg
- Height: ${context.height} cm

Return ONLY this exact JSON structure with no additional text or markdown:
{
  "nutrition": ["<string>", "<string>", "<string>"],
  "physical_activity": ["<string>", "<string>", "<string>"],
  "cognitive_focus": ["<string>", "<string>", "<string>"],
  "sleep_recommendations": ["<string>", "<string>", "<string>"]
}

Rules:
- Each array must contain exactly 3 actionable, specific recommendations.
- Tailor every recommendation to the child's exact age group and measurements.
- Use clear, parent-friendly language.
- Do NOT include any text outside the JSON object.`;
}

// ── Service method ───────────────────────────────────────────────────────────

/**
 * Calls OpenRouter (Gemini 2.5 Flash) to fetch age-appropriate parenting
 * guidelines for the given child profile.
 *
 * Returns a pre-defined fallback structure on any network or parse failure.
 */
export async function fetchGuidelinesFromAI(
  ageInMonths: number,
  context: { weight: number; height: number }
): Promise<GuidelineResponse> {
  try {
    const response = await openRouterClient.post("/chat/completions", {
      model: AI_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(ageInMonths, context) },
      ],
      temperature: 0.4,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    // ── Extract content ──────────────────────────────────────────────────────
    const rawContent: string | undefined =
      response.data?.choices?.[0]?.message?.content;

    if (!rawContent || rawContent.trim() === "") {
      console.error("⚠️  OpenRouter returned an empty response body.");
      return FALLBACK_GUIDELINES;
    }

    // ── Strip any accidental markdown fences ────────────────────────────────
    const cleaned = rawContent
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed: GuidelineResponse = JSON.parse(cleaned);

    // ── Validate required keys exist ─────────────────────────────────────────
    const requiredKeys: (keyof GuidelineResponse)[] = [
      "nutrition",
      "physical_activity",
      "cognitive_focus",
      "sleep_recommendations",
    ];

    const missingKeys = requiredKeys.filter(
      (k) => !Array.isArray(parsed[k]) || parsed[k].length === 0
    );

    if (missingKeys.length > 0) {
      console.error(
        `⚠️  AI response missing or empty keys: ${missingKeys.join(", ")}`
      );
      return FALLBACK_GUIDELINES;
    }

    return parsed;
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Network timeout
      if (error.message.includes("timeout")) {
        console.error("❌ OpenRouter request timed out:", error.message);
      }
      // JSON parse failure
      else if (error instanceof SyntaxError) {
        console.error("❌ Failed to parse AI JSON response:", error.message);
      }
      // Axios HTTP error
      else if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        const axiosErr = error as { response: { status: number; data: unknown } };
        console.error(
          `❌ OpenRouter HTTP ${axiosErr.response.status}:`,
          axiosErr.response.data
        );
      } else {
        console.error("❌ Unexpected error calling OpenRouter:", error.message);
      }
    }

    return FALLBACK_GUIDELINES;
  }
}
