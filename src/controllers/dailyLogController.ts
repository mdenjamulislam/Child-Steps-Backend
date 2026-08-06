import { Request, Response } from "express";
import { supabase } from "../config/supabase";

/**
 * Validates that the current user is the parent of the requested child.
 * @param childId The ID of the child
 * @param parentId The ID of the parent (req.authUser.id)
 * @returns boolean indicating if the user has access
 */
async function verifyChildAccess(childId: string, parentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("parent_id", parentId)
    .single();

  if (error || !data) {
    return false;
  }
  return true;
}

/**
 * Upsert a daily log entry for a child on a specific date.
 * Uses (child_id, log_date) unique constraint.
 */
export const upsertLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      child_id,
      log_date,
      sleep_hours,
      diet_details,
      mood,
      physical_activity_minutes,
      notes,
    } = req.body;

    if (!child_id) {
      res.status(400).json({ success: false, error: "child_id is required." });
      return;
    }

    const userId = req.authUser?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const hasAccess = await verifyChildAccess(child_id, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, error: "Access denied to this child's records." });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const targetDate = log_date || today;

    const logData = {
      child_id,
      log_date: targetDate,
      sleep_hours,
      diet_details,
      mood,
      physical_activity_minutes,
      notes,
    };

    const { data, error } = await supabase
      .from("daily_logs")
      .upsert(logData, { onConflict: 'child_id,log_date' })
      .select()
      .single();

    if (error) {
      console.error("Error upserting daily log:", error);
      res.status(500).json({ success: false, error: "Failed to save daily log." });
      return;
    }

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error("Upsert log error:", error);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};

/**
 * Get a daily log for a child by a specific date.
 */
export const getLogByDate = async (req: Request, res: Response): Promise<void> => {
  try {
    const childId = req.params.childId as string;
    const date = req.params.date as string;
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const hasAccess = await verifyChildAccess(childId, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, error: "Access denied to this child's records." });
      return;
    }

    const { data, error } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("child_id", childId)
      .eq("log_date", date)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 is no rows returned
      console.error("Error fetching daily log by date:", error);
      res.status(500).json({ success: false, error: "Failed to fetch daily log." });
      return;
    }

    res.status(200).json({ success: true, data: data || null });
  } catch (error: any) {
    console.error("Get log by date error:", error);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};

/**
 * Get daily logs for a child within a date range.
 */
export const getLogsByDateRange = async (req: Request, res: Response): Promise<void> => {
  try {
    const childId = req.params.childId as string;
    const { start_date, end_date } = req.query;
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    if (!start_date || !end_date) {
      res.status(400).json({ success: false, error: "start_date and end_date query parameters are required." });
      return;
    }

    const hasAccess = await verifyChildAccess(childId, userId);
    if (!hasAccess) {
      res.status(403).json({ success: false, error: "Access denied to this child's records." });
      return;
    }

    const { data, error } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("child_id", childId)
      .gte("log_date", start_date as string)
      .lte("log_date", end_date as string)
      .order("log_date", { ascending: false });

    if (error) {
      console.error("Error fetching daily logs by date range:", error);
      res.status(500).json({ success: false, error: "Failed to fetch daily logs." });
      return;
    }

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error("Get logs by date range error:", error);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};
