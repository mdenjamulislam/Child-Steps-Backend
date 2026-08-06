import { Router } from "express";
import childrenRoutes from "./children.routes";
import milestoneRoutes from "./milestoneRoutes";
import growthRoutes from "./growthRoutes";
import authRoutes from "./auth.routes";
import dailyLogRoutes from "./dailyLogRoutes";

const router = Router();

router.use("/children", childrenRoutes);
router.use("/milestones", milestoneRoutes);
router.use("/growth", growthRoutes);
router.use("/auth", authRoutes);
router.use("/daily-logs", dailyLogRoutes);

export default router;
