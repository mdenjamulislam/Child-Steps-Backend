import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { verifyChildAccess } from "../utils/childAccess";
import type { Vaccine, VaccinationRecord } from "../types";

// ── Helper: add months to a date string ──────────────────────────────────────
function addMonthsToDate(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vaccinations/initialize/:childId
// Creates vaccination_records for a child based on the vaccines catalog.
// Skips gracefully if already initialized (UNIQUE constraint on child_id+vaccine_id).
// ─────────────────────────────────────────────────────────────────────────────
export const initializeSchedule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { childId } = req.params;
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    if (!childId) {
      res.status(400).json({ success: false, error: "childId is required." });
      return;
    }

    // Verify parent ownership
    const hasAccess = await verifyChildAccess(childId, userId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only manage records for your own children.",
      });
      return;
    }

    // Fetch the child's date_of_birth
    const { data: child, error: childError } = await supabase
      .from("children")
      .select("date_of_birth")
      .eq("id", childId)
      .single();

    if (childError || !child) {
      res.status(404).json({ success: false, error: "Child not found." });
      return;
    }

    // Fetch the full vaccines master catalog
    const { data: vaccines, error: vaccinesError } = await supabase
      .from("vaccines")
      .select("*")
      .order("recommended_age_months", { ascending: true });

    if (vaccinesError || !vaccines || vaccines.length === 0) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch vaccines catalog.",
      });
      return;
    }

    // Build insert records: scheduled_date = DOB + recommended_age_months
    const records = (vaccines as Vaccine[]).map((vaccine) => ({
      child_id: childId,
      vaccine_id: vaccine.id,
      scheduled_date: addMonthsToDate(
        child.date_of_birth,
        vaccine.recommended_age_months
      ),
      status: "scheduled" as const,
    }));

    // Upsert — on conflict (child_id, vaccine_id) do nothing so re-init is safe
    const { data, error } = await supabase
      .from("vaccination_records")
      .upsert(records, { onConflict: "child_id,vaccine_id", ignoreDuplicates: true })
      .select();

    if (error) {
      console.error("Error initializing vaccination schedule:", error);
      res.status(500).json({
        success: false,
        error: "Failed to initialize vaccination schedule.",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: `Vaccination schedule initialized with ${vaccines.length} vaccines.`,
      data,
    });
  } catch (err: any) {
    console.error("initializeSchedule error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vaccinations/:childId
// Returns the full vaccination timeline for a child, joined with vaccine info.
// ─────────────────────────────────────────────────────────────────────────────
export const getVaccinationSchedule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { childId } = req.params;
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    if (!childId) {
      res.status(400).json({ success: false, error: "childId is required." });
      return;
    }

    // Verify parent ownership
    const hasAccess = await verifyChildAccess(childId, userId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only view records for your own children.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("vaccination_records")
      .select(
        `
        id,
        child_id,
        vaccine_id,
        scheduled_date,
        status,
        administered_date,
        administered_by,
        notes,
        created_at,
        updated_at,
        vaccine:vaccines (
          id,
          name,
          description,
          recommended_age_months,
          doses_required,
          created_at
        )
      `
      )
      .eq("child_id", childId)
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error("Error fetching vaccination schedule:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch vaccination schedule.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: (data ?? []) as VaccinationRecord[],
    });
  } catch (err: any) {
    console.error("getVaccinationSchedule error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/vaccinations/record/:recordId
// Marks a vaccination record as administered (or updates notes).
// Validates that the record belongs to one of the parent's children.
// ─────────────────────────────────────────────────────────────────────────────
export const markAdministered = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { recordId } = req.params;
    const { administered_date, administered_by, notes, status } = req.body;
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    if (!recordId) {
      res.status(400).json({ success: false, error: "recordId is required." });
      return;
    }

    // Fetch the record to verify ownership
    const { data: record, error: recordError } = await supabase
      .from("vaccination_records")
      .select("id, child_id")
      .eq("id", recordId)
      .single();

    if (recordError || !record) {
      res.status(404).json({ success: false, error: "Vaccination record not found." });
      return;
    }

    // Verify parent owns this child
    const hasAccess = await verifyChildAccess(record.child_id, userId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only update records for your own children.",
      });
      return;
    }

    const validStatuses = ["scheduled", "administered", "skipped"];
    const finalStatus = status && validStatuses.includes(status) ? status : "administered";

    const updatePayload: Partial<VaccinationRecord> = {
      status: finalStatus,
      notes: notes ?? null,
    };

    if (finalStatus === "administered") {
      updatePayload.administered_date =
        administered_date ?? new Date().toISOString().split("T")[0];
      updatePayload.administered_by = administered_by ?? null;
    }

    const { data, error } = await supabase
      .from("vaccination_records")
      .update(updatePayload)
      .eq("id", recordId)
      .select(
        `
        id, child_id, vaccine_id, scheduled_date, status,
        administered_date, administered_by, notes, created_at, updated_at,
        vaccine:vaccines (id, name, description, recommended_age_months, doses_required, created_at)
      `
      )
      .single();

    if (error) {
      console.error("Error updating vaccination record:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update vaccination record.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Vaccination record updated successfully.",
      data,
    });
  } catch (err: any) {
    console.error("markAdministered error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
};
