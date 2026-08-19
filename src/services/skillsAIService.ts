import { openRouterClient, AI_MODEL } from "../config/openrouter";
import type { AISuggestedSkill } from "../types";

// ── Fallback suggestions returned on any AI failure ───────────────────────────

const FALLBACK_SKILLS: AISuggestedSkill[] = [
  {
    skill_name: "Creative Storytelling",
    category: "academic",
    rationale:
      "Storytelling builds vocabulary, sequencing ability, and imaginative thinking. It also strengthens the child's ability to structure thoughts coherently, which is a core academic competency.",
    recommended_activities: [
      "Ask your child to narrate the day's events in 5 sentences every evening.",
      "Read a picture book and pause mid-story to let your child predict what happens next.",
      "Create a simple 'story dice' game using household items as props.",
    ],
  },
  {
    skill_name: "Basic Drawing & Sketching",
    category: "artistic",
    rationale:
      "Drawing develops fine motor control and visual-spatial reasoning simultaneously. Regular sketching practice also nurtures patience and attention to detail in young children.",
    recommended_activities: [
      "Set aside 15 minutes daily for free drawing with minimal guidance.",
      "Ask your child to draw a scene from their favourite story or cartoon.",
      "Introduce simple shapes (circles, triangles) and have them combine shapes into animals.",
    ],
  },
  {
    skill_name: "Cooperative Team Games",
    category: "social",
    rationale:
      "Team games teach turn-taking, negotiation, and empathy through direct peer interaction. These experiences lay the foundation for effective collaboration later in school and work environments.",
    recommended_activities: [
      "Organise a weekly family board game night with age-appropriate cooperative games.",
      "Encourage playdates where children must build something together (e.g., block towers).",
      "Introduce simple role-play scenarios that require two players to work toward a shared goal.",
    ],
  },
];

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return (
    "You are a child development specialist and educational coach with 20+ years of experience. " +
    "When given a child's profile (age, physical metrics, recent academic performance, daily activity habits), " +
    "you suggest highly personalised, actionable skill development opportunities. " +
    "You ALWAYS respond with ONLY a valid JSON array — no markdown fences, no extra commentary."
  );
}

function buildUserPrompt(context: {
  ageLabel: string;
  ageInMonths: number;
  recentGrades: string;
  activityHabits: string;
  physicalMetrics: string;
  childName: string;
}): string {
  return `Generate exactly 3 personalised skill suggestions for the following child profile:

Child Name: ${context.childName}
Age: ${context.ageLabel} (${context.ageInMonths} months total)
Physical Metrics: ${context.physicalMetrics}
Recent Academic Performance: ${context.recentGrades}
Daily Activity Habits: ${context.activityHabits}

Return ONLY this exact JSON array structure — no text outside the array:
[
  {
    "skill_name": "<concise skill name, e.g. 'Creative Writing'>",
    "category": "<one of exactly: academic | artistic | athletic | social | technical>",
    "rationale": "<exactly 2 sentences explaining why this skill fits the child's current profile>",
    "recommended_activities": [
      "<practical activity 1 parents can implement at home>",
      "<practical activity 2 parents can implement at home>",
      "<practical activity 3 parents can implement at home>"
    ]
  }
]

Rules:
- The array must contain exactly 3 skill objects.
- Each category value must be one of: academic, artistic, athletic, social, technical.
- The rationale must be exactly 2 sentences.
- Each recommended_activities array must have exactly 3 items.
- Tailor every suggestion to the child's exact age group, academic records, and daily habits.
- Skills should be diverse — use different categories where possible.
- Use clear, parent-friendly, actionable language.
- Do NOT include any text outside the JSON array.`;
}

// ── Service method ────────────────────────────────────────────────────────────

/**
 * Calls OpenRouter (Gemini 2.5 Flash) to generate 3 personalised skill
 * suggestions for the given child context.
 *
 * Returns a pre-defined fallback list on any network or parse failure.
 */
export async function generateSkillSuggestions(context: {
  ageLabel: string;
  ageInMonths: number;
  recentGrades: string;
  activityHabits: string;
  physicalMetrics: string;
  childName: string;
}): Promise<AISuggestedSkill[]> {
  try {
    const response = await openRouterClient.post("/chat/completions", {
      model: AI_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(context) },
      ],
      temperature: 0.55,
      max_tokens: 1200,
    });

    // ── Extract content ────────────────────────────────────────────────────
    const rawContent: string | undefined =
      response.data?.choices?.[0]?.message?.content;

    if (!rawContent || rawContent.trim() === "") {
      console.error("⚠️  OpenRouter returned an empty response body for skills.");
      return FALLBACK_SKILLS;
    }

    // ── Strip accidental markdown fences ──────────────────────────────────
    const cleaned = rawContent
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed: AISuggestedSkill[] = JSON.parse(cleaned);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.error("⚠️  AI skill response is not a non-empty array.");
      return FALLBACK_SKILLS;
    }

    // ── Basic structure validation ─────────────────────────────────────────
    const validCategories = new Set([
      "academic",
      "artistic",
      "athletic",
      "social",
      "technical",
    ]);

    const valid = parsed.every(
      (s) =>
        typeof s.skill_name === "string" &&
        validCategories.has(s.category) &&
        typeof s.rationale === "string" &&
        Array.isArray(s.recommended_activities) &&
        s.recommended_activities.length > 0
    );

    if (!valid) {
      console.error("⚠️  One or more AI skill suggestions failed validation.");
      return FALLBACK_SKILLS;
    }

    return parsed;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      console.error("❌ Failed to parse AI skills JSON response:", error.message);
    } else if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        console.error("❌ OpenRouter skills request timed out:", error.message);
      } else {
        console.error("❌ Unexpected error calling OpenRouter for skills:", error.message);
      }
    }

    return FALLBACK_SKILLS;
  }
}
