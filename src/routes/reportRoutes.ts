import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { getReportSummary } from "../controllers/reportController";

const router = Router();

// Secure all report routes
router.use(requireAuth);

/**
 * GET /api/reports/summary/:childId
 * Retrieves the complete synthesized progress report for a child.
 */
router.get("/summary/:childId", getReportSummary);

export default router;
