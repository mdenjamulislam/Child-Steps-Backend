import { Router } from "express";
import childrenRoutes from "./children.routes";
import milestonesRoutes from "./milestones.routes";
import authRoutes from "./auth.routes";

const router = Router();

router.use("/children", childrenRoutes);
router.use("/milestones", milestonesRoutes);
router.use("/auth", authRoutes);

export default router;
