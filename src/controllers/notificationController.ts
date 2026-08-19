import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { generateSystemNotifications } from "../services/reminderService";
import type { NotificationRecord } from "../types";

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * GET /api/notifications
 * Retrieves all notifications for the authenticated user, ordered by read status and date.
 */
export const getNotifications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const profileId = req.authUser?.profile?.id;
    if (!profileId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", profileId)
      .order("is_read", { ascending: true }) // unread first
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ success: false, error: "Failed to fetch notifications." });
      return;
    }

    res.status(200).json({
      success: true,
      data: data as NotificationRecord[],
    });
  } catch (err: any) {
    console.error("getNotifications error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Marks a single notification as read.
 */
export const markAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const profileId = req.authUser?.profile?.id;
    if (!profileId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    const notificationId = String(req.params.id ?? "");
    if (!notificationId || !isValidUUID(notificationId)) {
      res.status(400).json({ success: false, error: "A valid notification ID is required." });
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("profile_id", profileId) // Ensure they own it
      .select("*")
      .single();

    if (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ success: false, error: "Failed to mark as read." });
      return;
    }

    res.status(200).json({
      success: true,
      data: data as NotificationRecord,
    });
  } catch (err: any) {
    console.error("markAsRead error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
};

/**
 * PUT /api/notifications/read-all
 * Marks all notifications for the user as read.
 */
export const markAllAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const profileId = req.authUser?.profile?.id;
    if (!profileId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("profile_id", profileId)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking all as read:", error);
      res.status(500).json({ success: false, error: "Failed to mark all as read." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (err: any) {
    console.error("markAllAsRead error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
};

/**
 * POST /api/notifications/run-check
 * Manually triggers the background routine for the current user's children.
 */
export const runCheck = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const profileId = req.authUser?.profile?.id;
    if (!profileId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    const { generated } = await generateSystemNotifications(profileId);

    res.status(200).json({
      success: true,
      message: `System check complete. Generated ${generated} new notification(s).`,
      generated,
    });
  } catch (err: any) {
    console.error("runCheck error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
};
