import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  generateSkills,
  getChildSkills,
  updateSkillStatus,
} from "../controllers/skillsController";

const router = Router();

// All /api/skills routes require authentication
router.use(requireAuth);

/**
 * POST /api/skills/generate/:childId
 * Triggers OpenRouter AI to generate 3 personalised skill suggestions
 * and persists them to public.child_skills with status 'suggested'.
 */
router.post("/generate/:childId", generateSkills);

/**
 * GET /api/skills/:childId
 * Returns all skill records for a child categorised by status
 * (suggested | learning | acquired).
 */
router.get("/:childId", getChildSkills);

/**
 * PUT /api/skills/:skillId/status
 * Transitions a skill's status:
 *   suggested → learning → acquired
 * Body: { status: 'suggested' | 'learning' | 'acquired' }
 */
router.put("/:skillId/status", updateSkillStatus);

export default router;
