import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { getGuidelines } from "../controllers/guidelineController";
import { openRouterClient, AI_MODEL } from "../config/openrouter";

const router = Router();

// ── Public test route (no auth required) ────────────────────────────────────
/**
 * GET /api/guidelines/test-ai
 * Quick connectivity check — sends a single "hello" message to OpenRouter
 * and returns the model's reply. Use this to verify your API key is valid.
 */
router.get("/test-ai", async (_req: Request, res: Response) => {
  try {
    const response = await openRouterClient.post("/chat/completions", {
      model: AI_MODEL,
      messages: [
        {
          role: "user",
          content:
            'Say "OpenRouter connection successful! Child Development Tracker is ready." in exactly those words.',
        },
      ],
      max_tokens: 30,
    });

    const message: string =
      response.data?.choices?.[0]?.message?.content ?? "(no response)";

    res.json({
      success: true,
      model: AI_MODEL,
      message,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status: number; data: unknown } };
    console.error("❌ /test-ai failed:", err.message ?? error);
    res.status(500).json({
      success: false,
      error: err.message ?? "OpenRouter request failed.",
      hint: "Check that OPENROUTER_API_KEY is set correctly in your .env file.",
    });
  }
});

// ── Protected routes ─────────────────────────────────────────────────────────
router.use(requireAuth);

router.get("/:childId", getGuidelines);

export default router;
