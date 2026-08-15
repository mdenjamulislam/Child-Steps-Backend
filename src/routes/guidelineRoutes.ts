import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { getGuidelines } from "../controllers/guidelineController";

const router = Router();

// Protect all guideline routes
router.use(requireAuth);

router.get("/:childId", getGuidelines);

export default router;
