import { Router } from "express";
import {
  addGrowthRecord,
  getGrowthHistory,
} from "../controllers/growthController";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// Protect all growth routes with authentication middleware
router.use(requireAuth);

// POST /api/growth (add measurements)
router.post("/", addGrowthRecord);

// GET /api/growth/:childId (history)
router.get("/:childId", getGrowthHistory);

export default router;
