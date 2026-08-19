import { Router } from "express";
import childrenRoutes from "./children.routes";
import milestoneRoutes from "./milestoneRoutes";
import growthRoutes from "./growthRoutes";
import authRoutes from "./auth.routes";
import dailyLogRoutes from "./dailyLogRoutes";
import vaccinationRoutes from "./vaccinationRoutes";
import guidelineRoutes from "./guidelineRoutes";
import educationRoutes from "./educationRoutes";
import skillsRoutes from "./skillsRoutes";
import notificationRoutes from "./notificationRoutes";
import reportRoutes from "./reportRoutes";
import careerRoutes from "./careerRoutes";

const router = Router();

router.use("/children", childrenRoutes);
router.use("/milestones", milestoneRoutes);
router.use("/growth", growthRoutes);
router.use("/auth", authRoutes);
router.use("/daily-logs", dailyLogRoutes);
router.use("/vaccinations", vaccinationRoutes);
router.use("/guidelines", guidelineRoutes);
router.use("/education", educationRoutes);
router.use("/skills", skillsRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reports", reportRoutes);
router.use("/career", careerRoutes);

export default router;

