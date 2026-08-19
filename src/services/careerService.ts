import { openRouterClient, AI_MODEL } from "../config/openrouter";

// -- Types --------------------------------------------------------------------

export interface CareerActionStep {
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

export interface CareerGuidanceAIResponse {
  recommended_path: string;
  rationale: string;
  action_steps: CareerActionStep[];
}

// -- Fallback data returned on any API failure ---------------------------------

const FALLBACK_CAREER_GUIDANCE: CareerGuidanceAIResponse = {
  recommended_path: "Broad Foundational Development",
  rationale:
    "Insufficient profile data was available to generate a specific career pathway. We recommend focusing on building a well-rounded foundation across academics, creativity, and social skills during this period.",
  action_steps: [
    {
      title: "Explore a Wide Range of Subjects",
      description:
        "Encourage the child to engage with science, arts, literature, and sport equally to discover natural interests and strengths.",
      difficulty: "Beginner",
    },
    {
      title: "Build Consistent Study Habits",
      description:
        "Establish a daily 30-minute focused learning session to strengthen academic discipline across all subjects.",
      difficulty: "Beginner",
    },
    {
      title: "Join a Club or Activity Group",
      description:
        "Participate in a structured extracurricular (e.g., robotics club, art class, or sports team) to develop collaboration and communication skills.",
      difficulty: "Intermediate",
    },
  ],
};

// -- Prompt builders -----------------------------------------------------------

function buildSystemPrompt(): string {
  return (
    "You are a world-class child development and career counselling expert. " +
    "Given a child's academic subject grades and acquired skill tags, you provide a " +
    "structured, age-appropriate career development roadmap tailored precisely to their " +
    "unique strengths. " +
    "You ALWAYS respond with ONLY a valid JSON object � no markdown fences, no extra text."
  );
}

function buildUserPrompt(params: {
  ageYears: number;
  topSubjects: { subject: string; score: number }[];
  acquiredSkills: string[];
}): string {
  const { ageYears, topSubjects, acquiredSkills } = params;

  const isYoung = ageYears < 10;

  const subjectBlock =
    topSubjects.length > 0
      ? topSubjects
          .map((s) => `  - ${s.subject}: ${s.score}/100`)
          .join("\n")
      : "  - No academic records available yet.";

  const skillsBlock =
    acquiredSkills.length > 0
      ? acquiredSkills.map((s) => `  - ${s}`).join("\n")
      : "  - No acquired skills recorded yet.";

  const focusNote = isYoung
    ? "IMPORTANT: The child is under 10 years old. Focus exclusively on foundational hobbies, creative exploration, and soft skills rather than specific professional career paths."
    : "Generate specific professional career pathway recommendations grounded in their academic and skill profile.";

  return `Provide a career development roadmap for a ${ageYears}-year-old child with the following profile:

TOP ACADEMIC SUBJECTS (by score):
${subjectBlock}

ACQUIRED SKILLS:
${skillsBlock}

${focusNote}

Return ONLY this exact JSON structure with no additional text or markdown:
{
  "recommended_path": "<string: e.g., 'Digital Arts & Design' or 'Scientific Research & Biology'>",
  "rationale": "<string: 2-4 sentences explaining why this field fits their grades and skills>",
  "action_steps": [
    {
      "title": "<string: concise action step title>",
      "description": "<string: 1-2 sentence description of the step>",
      "difficulty": "<string: exactly one of: Beginner, Intermediate, Advanced>"
    }
  ]
}

Rules:
- action_steps must contain between 4 and 6 items total.
- Progress difficulty from Beginner through Intermediate to Advanced across the steps.
- Use clear, parent-friendly and child-friendly language.
- recommended_path must be specific (e.g., "Environmental Science & Conservation") not generic (e.g., "Science").
- Do NOT include any text outside the JSON object.`;
}

// -- Service method ------------------------------------------------------------

/**
 * Calls OpenRouter (Gemini 2.5 Flash) to generate an age-tailored career
 * development roadmap based on the child's academic and skill profile.
 *
 * Returns a safe fallback structure on any network or parse failure.
 */
export async function generateCareerGuidanceFromAI(params: {
  ageYears: number;
  topSubjects: { subject: string; score: number }[];
  acquiredSkills: string[];
}): Promise<CareerGuidanceAIResponse> {
  try {
    const response = await openRouterClient.post("/chat/completions", {
      model: AI_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(params) },
      ],
      temperature: 0.5,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    // -- Extract content --------------------------------------------------------
    const rawContent: string | undefined =
      response.data?.choices?.[0]?.message?.content;

    if (!rawContent || rawContent.trim() === "") {
      console.error("??  OpenRouter returned an empty response body.");
      return FALLBACK_CAREER_GUIDANCE;
    }

    // -- Strip any accidental markdown fences ---------------------------------
    const cleaned = rawContent
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed: CareerGuidanceAIResponse = JSON.parse(cleaned);

    // -- Validate required keys ------------------------------------------------
    if (
      typeof parsed.recommended_path !== "string" ||
      typeof parsed.rationale !== "string" ||
      !Array.isArray(parsed.action_steps) ||
      parsed.action_steps.length === 0
    ) {
      console.error("??  AI career guidance response is missing required keys.");
      return FALLBACK_CAREER_GUIDANCE;
    }

    // -- Normalise difficulty values -------------------------------------------
    const validDifficulties = ["Beginner", "Intermediate", "Advanced"];
    parsed.action_steps = parsed.action_steps.map((step) => ({
      ...step,
      difficulty: validDifficulties.includes(step.difficulty)
        ? step.difficulty
        : "Beginner",
    }));

    return parsed;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        console.error("? OpenRouter career request timed out:", error.message);
      } else if (error instanceof SyntaxError) {
        console.error("? Failed to parse AI career JSON response:", error.message);
      } else {
        console.error("? Unexpected error calling OpenRouter for career guidance:", error.message);
      }
    }
    return FALLBACK_CAREER_GUIDANCE;
  }
}
