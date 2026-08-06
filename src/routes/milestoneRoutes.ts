import { Router } from "express";
import {
  getStandardCatalog,
  getChildMilestones,
  updateChildMilestone,
} from "../controllers/milestoneController";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// Protect all milestone routes with JWT auth middleware
router.use(requireAuth);

// GET /api/milestones/catalog (global catalog list)
router.get("/catalog", getStandardCatalog);

// GET /api/milestones/child/:childId (child-specific checklist)
router.get("/child/:childId", getChildMilestones);

// PUT /api/milestones/child/:childId/:milestoneId (update milestone progress)
router.put("/child/:childId/:milestoneId", updateChildMilestone);

export default router;
