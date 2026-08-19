import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  generateCareerRoadmap,
  getCareerHistory,
} from "../controllers/careerController";

const router = Router();

// -- All routes require authentication ----------------------------------------
router.use(requireAuth);

/**
 * POST /api/career/generate/:childId
 * Triggers OpenRouter AI to generate a career development roadmap for the child.
 * Only the authenticated parent who owns the child may call this endpoint.
 */
router.post("/generate/:childId", generateCareerRoadmap);

/**
 * GET /api/career/:childId
 * Retrieves saved career guidance history logs for a specific child.
 * Only the authenticated parent who owns the child may call this endpoint.
 */
router.get("/:childId", getCareerHistory);

export default router;
