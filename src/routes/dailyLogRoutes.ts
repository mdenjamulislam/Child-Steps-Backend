import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { upsertLog, getLogByDate, getLogsByDateRange } from "../controllers/dailyLogController";

const router = Router();

// All daily log routes require authentication
router.use(requireAuth);

// Upsert log entry
router.post("/", upsertLog);

// Get logs by date range for a specific child
router.get("/child/:childId", getLogsByDateRange);

// Get log for a single specific date for a child
router.get("/child/:childId/date/:date", getLogByDate);

export default router;
