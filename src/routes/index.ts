import { Router } from "express";
import childrenRoutes from "./children.routes";
import milestoneRoutes from "./milestoneRoutes";
import growthRoutes from "./growthRoutes";
import authRoutes from "./auth.routes";
import dailyLogRoutes from "./dailyLogRoutes";
import vaccinationRoutes from "./vaccinationRoutes";

const router = Router();

router.use("/children", childrenRoutes);
router.use("/milestones", milestoneRoutes);
router.use("/growth", growthRoutes);
router.use("/auth", authRoutes);
router.use("/daily-logs", dailyLogRoutes);
router.use("/vaccinations", vaccinationRoutes);

export default router;
