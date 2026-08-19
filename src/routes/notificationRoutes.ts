import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  runCheck,
} from "../controllers/notificationController";

const router = Router();

// All notification routes require authentication
router.use(requireAuth);

/**
 * GET /api/notifications
 * Returns all notifications for the authenticated user.
 */
router.get("/", getNotifications);

/**
 * PUT /api/notifications/read-all
 * Marks all unread notifications as read.
 */
router.put("/read-all", markAllAsRead);

/**
 * PUT /api/notifications/:id/read
 * Marks a single notification as read.
 */
router.put("/:id/read", markAsRead);

/**
 * POST /api/notifications/run-check
 * Triggers the background reminder routine for the current user's children.
 */
router.post("/run-check", runCheck);

export default router;
