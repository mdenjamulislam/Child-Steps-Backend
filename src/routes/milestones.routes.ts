import { Router } from "express";
import {
  getMilestones,
  getMilestoneById,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "../controllers/milestones.controller";

const router = Router();

router.get("/", getMilestones);
router.get("/:id", getMilestoneById);
router.post("/", createMilestone);
router.put("/:id", updateMilestone);
router.delete("/:id", deleteMilestone);

export default router;
