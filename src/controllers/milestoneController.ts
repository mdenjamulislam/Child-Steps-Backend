import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { verifyChildAccess } from "../utils/childAccess";

/**
 * GET /api/milestones/catalog
 * Retrieves predefined standard milestones catalog.
 * Optional query parameter: category (Cognitive, Motor Skills, Language, Social-Emotional)
 */
export const getStandardCatalog = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { category, target_age_months } = req.query;

    let query = supabase
      .from("milestones")
      .select("*")
      .order("target_age_months", { ascending: true })
      .order("category", { ascending: true });

    if (category) {
      query = query.eq("category", category as string);
    }

    if (target_age_months) {
      query = query.lte("target_age_months", Number(target_age_months));
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching milestone catalog:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch milestone catalog." });
      return;
    }

    res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error("Get standard catalog error:", error);
    res
      .status(500)
      .json({ success: false, error: error.message || "Internal server error." });
  }
};

/**
 * GET /api/milestones/child/:childId
 * Retrieves the milestones checklist for a specific child, combining standard milestones
 * with the child's recorded status (not-started, in-progress, achieved).
 */
export const getChildMilestones = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const childId = req.params.childId as string;
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized access." });
      return;
    }

    if (!childId) {
      res.status(400).json({ success: false, error: "childId is required." });
      return;
    }

    // Authorization check
    const hasAccess = await verifyChildAccess(childId, userId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only view milestones for your own children.",
      });
      return;
    }

    // Fetch master catalog of milestones
    const { data: catalog, error: catalogError } = await supabase
      .from("milestones")
      .select("*")
      .order("target_age_months", { ascending: true });

    if (catalogError) {
      console.error("Error fetching master milestones:", catalogError);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch master milestones catalog." });
      return;
    }

    // Fetch existing child milestones
    const { data: childRecords, error: recordsError } = await supabase
      .from("child_milestones")
      .select("*")
      .eq("child_id", childId);

    if (recordsError) {
      console.error("Error fetching child milestones progress:", recordsError);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch child milestones progress." });
      return;
    }

    // Map child records by milestone_id for O(1) lookup
    const progressMap = new Map<string, any>();
    (childRecords || []).forEach((record) => {
      progressMap.set(record.milestone_id, record);
    });

    // Merge catalog items with child progress status
    const checklist = (catalog || []).map((milestone) => {
      const progress = progressMap.get(milestone.id);

      return {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description || null,
        target_age_months: milestone.target_age_months,
        category: milestone.category,
        child_milestone_id: progress?.id || null,
        status: progress?.status || "not-started",
        achieved_date: progress?.achieved_date || null,
        notes: progress?.notes || null,
      };
    });

    res.status(200).json({
      success: true,
      data: checklist,
    });
  } catch (error: any) {
    console.error("Get child milestones error:", error);
    res
      .status(500)
      .json({ success: false, error: error.message || "Internal server error." });
  }
};

/**
 * PUT /api/milestones/child/:childId/:milestoneId
 * Upserts the status of a specific milestone for a child.
 * (e.g. updates status to 'achieved' and records completion date).
 */
export const updateChildMilestone = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const childId = req.params.childId as string;
    const milestoneId = req.params.milestoneId as string;
    const { status, achieved_date, notes } = req.body;
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized access." });
      return;
    }

    if (!childId || !milestoneId) {
      res
        .status(400)
        .json({ success: false, error: "childId and milestoneId are required." });
      return;
    }

    const validStatuses = ["not-started", "in-progress", "achieved"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `status must be one of: ${validStatuses.join(", ")}`,
      });
      return;
    }

    // Authorization check
    const hasAccess = await verifyChildAccess(childId, userId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only update milestones for your own children.",
      });
      return;
    }

    // Determine achieved_date: default to today if marked achieved and date not passed
    let dateToSave: string | null = null;
    if (status === "achieved") {
      dateToSave = achieved_date || new Date().toISOString().split("T")[0];
    }

    const payload = {
      child_id: childId,
      milestone_id: milestoneId,
      status,
      achieved_date: dateToSave,
      notes: notes || null,
    };

    const { data, error } = await supabase
      .from("child_milestones")
      .upsert(payload, { onConflict: "child_id,milestone_id" })
      .select()
      .single();

    if (error) {
      console.error("Error upserting child milestone:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update milestone progress." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Milestone status updated successfully.",
      data,
    });
  } catch (error: any) {
    console.error("Update child milestone error:", error);
    res
      .status(500)
      .json({ success: false, error: error.message || "Internal server error." });
  }
};
