import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { verifyChildAccess } from "../utils/childAccess";
import type { Vaccine, VaccinationRecord } from "../types";

// ── Helper: add months to a date string (handles month-end edge cases) ────────
function addMonthsToDate(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split("T")[0];
}

// ── Helper: validate UUID format ──────────────────────────────────────────────
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// ── Helper: validate ISO date string (YYYY-MM-DD) ─────────────────────────────
function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vaccinations/initialize/:childId
// Creates vaccination_records for a child based on the master vaccines catalog.
// Idempotent — uses upsert with ignoreDuplicates so re-calling is always safe.
// ─────────────────────────────────────────────────────────────────────────────
export const initializeSchedule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const childId = String(req.params.childId ?? "");
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    if (!childId || !isValidUUID(childId)) {
      res.status(400).json({ success: false, error: "A valid childId UUID is required." });
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

    if (!child.date_of_birth || !isValidDate(child.date_of_birth)) {
      res.status(422).json({
        success: false,
        error: "Child's date_of_birth is missing or invalid. Cannot build vaccination schedule.",
      });
      return;
    }

    // Fetch the full vaccines master catalog, ordered chronologically
    const { data: vaccines, error: vaccinesError } = await supabase
      .from("vaccines")
      .select("*")
      .order("recommended_age_months", { ascending: true });

    if (vaccinesError) {
      console.error("Error fetching vaccines catalog:", vaccinesError);
      res.status(500).json({
        success: false,
        error: "Failed to fetch vaccines catalog.",
      });
      return;
    }

    if (!vaccines || vaccines.length === 0) {
      res.status(404).json({
        success: false,
        error: "No vaccines found in the catalog. Please seed the vaccines table first.",
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
      administered_date: null,
      administered_by: null,
      notes: null,
    }));

    // Upsert — on conflict (child_id, vaccine_id) do nothing so re-init is safe
    const { data: rawData, error } = await supabase
      .from("vaccination_records")
      .upsert(records, { onConflict: "child_id,vaccine_id", ignoreDuplicates: true })
      .select(`
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
      `);

    if (error) {
      console.error("Error initializing vaccination schedule:", error);
      res.status(500).json({
        success: false,
        error: "Failed to initialize vaccination schedule.",
      });
      return;
    }

    const data = (rawData ?? []) as unknown as VaccinationRecord[];

    res.status(201).json({
      success: true,
      message: `Vaccination schedule initialized with ${vaccines.length} vaccine(s). Re-initialization skips existing records.`,
      data,
    });
  } catch (err: any) {
    console.error("initializeSchedule error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vaccinations/:childId
// Returns the full vaccination timeline for a child, joined with vaccine info,
// sorted chronologically by scheduled_date.
// ─────────────────────────────────────────────────────────────────────────────
export const getVaccinationSchedule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const childId = String(req.params.childId ?? "");
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    if (!childId || !isValidUUID(childId)) {
      res.status(400).json({ success: false, error: "A valid childId UUID is required." });
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
      data: (data ?? []) as unknown as VaccinationRecord[],
    });
  } catch (err: any) {
    console.error("getVaccinationSchedule error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/vaccinations/record/:recordId
// Marks a vaccination record as 'administered' or 'skipped' and captures
// administered_date, administered_by (clinic/doctor name), and optional notes.
// Validates parent-ownership and all required fields.
// ─────────────────────────────────────────────────────────────────────────────
export const markAdministered = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const recordId = String(req.params.recordId ?? "");
    const { administered_date, administered_by, notes, status } = req.body;
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    if (!recordId || !isValidUUID(recordId)) {
      res.status(400).json({ success: false, error: "A valid recordId UUID is required." });
      return;
    }

    // Validate and resolve status
    const validStatuses = ["scheduled", "administered", "skipped"] as const;
    type ValidStatus = (typeof validStatuses)[number];
    const finalStatus: ValidStatus =
      status && validStatuses.includes(status as ValidStatus)
        ? (status as ValidStatus)
        : "administered";

    // Validate administered_date format
    if (administered_date && !isValidDate(administered_date)) {
      res.status(400).json({
        success: false,
        error: "administered_date must be a valid YYYY-MM-DD date string.",
      });
      return;
    }

    // administered_by is required when marking as administered
    if (finalStatus === "administered") {
      if (!administered_by || typeof administered_by !== "string" || !administered_by.trim()) {
        res.status(400).json({
          success: false,
          error: "administered_by (doctor or clinic name) is required when marking a vaccine as administered.",
        });
        return;
      }
    }

    // Fetch the record to verify ownership
    const { data: record, error: recordError } = await supabase
      .from("vaccination_records")
      .select("id, child_id, status")
      .eq("id", recordId)
      .single();

    if (recordError || !record) {
      res.status(404).json({ success: false, error: "Vaccination record not found." });
      return;
    }

    // Verify the authenticated parent owns this child
    const hasAccess = await verifyChildAccess(record.child_id, userId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only update records for your own children.",
      });
      return;
    }

    // Build the update payload based on target status
    const updatePayload: Partial<VaccinationRecord> = {
      status: finalStatus,
    };

    if (finalStatus === "administered") {
      updatePayload.administered_date =
        administered_date ?? new Date().toISOString().split("T")[0];
      updatePayload.administered_by = administered_by.trim();
      updatePayload.notes = notes?.trim() || null;
    } else if (finalStatus === "skipped") {
      // Clear administered fields when skipping
      updatePayload.administered_date = null;
      updatePayload.administered_by = null;
      updatePayload.notes = notes?.trim() || null;
    } else {
      // Reverting to scheduled — clear all tracking fields
      updatePayload.administered_date = null;
      updatePayload.administered_by = null;
      updatePayload.notes = null;
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
      message: `Vaccination record marked as '${finalStatus}' successfully.`,
      data,
    });
  } catch (err: any) {
    console.error("markAdministered error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/vaccinations/record/:recordId
// Resets a vaccination record back to 'scheduled', clearing all administered
// fields. Useful for correcting logging mistakes.
// ─────────────────────────────────────────────────────────────────────────────
export const resetVaccinationRecord = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const recordId = String(req.params.recordId ?? "");
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    if (!recordId || !isValidUUID(recordId)) {
      res.status(400).json({ success: false, error: "A valid recordId UUID is required." });
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

    const hasAccess = await verifyChildAccess(record.child_id, userId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only reset records for your own children.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("vaccination_records")
      .update({
        status: "scheduled",
        administered_date: null,
        administered_by: null,
        notes: null,
      })
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
      console.error("Error resetting vaccination record:", error);
      res.status(500).json({
        success: false,
        error: "Failed to reset vaccination record.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Vaccination record reset to 'scheduled' status successfully.",
      data,
    });
  } catch (err: any) {
    console.error("resetVaccinationRecord error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
};
