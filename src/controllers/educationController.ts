import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { verifyChildAccess } from "../utils/childAccess";
import type { EducationalRecord } from "../types";

// ── Helper: validate UUID format ──────────────────────────────────────────────
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

// ── Helper: sanitize trimmed string (returns undefined if blank) ───────────────
function trim(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/education
// Adds a new educational / academic record for a child.
// The logged_by field is automatically set to the authenticated user's profile ID.
// Access: parent who owns the child, OR a teacher/staff role.
// ─────────────────────────────────────────────────────────────────────────────
export const addAcademicRecord = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    const {
      child_id,
      academic_year,
      grade_level,
      subject,
      score_or_grade,
      teacher_feedback,
    } = req.body;

    // ── Field Validation ──────────────────────────────────────────────────────

    if (!child_id || !isValidUUID(String(child_id))) {
      res
        .status(400)
        .json({ success: false, error: "A valid child_id UUID is required." });
      return;
    }

    const cleanAcademicYear = trim(academic_year);
    if (!cleanAcademicYear) {
      res
        .status(400)
        .json({ success: false, error: "academic_year is required (e.g. '2025-2026')." });
      return;
    }
    // Validate academic_year format: YYYY-YYYY
    if (!/^\d{4}-\d{4}$/.test(cleanAcademicYear)) {
      res.status(400).json({
        success: false,
        error: "academic_year must follow the format 'YYYY-YYYY' (e.g. '2025-2026').",
      });
      return;
    }

    const cleanGradeLevel = trim(grade_level);
    if (!cleanGradeLevel) {
      res
        .status(400)
        .json({ success: false, error: "grade_level is required." });
      return;
    }

    const cleanSubject = trim(subject);
    if (!cleanSubject) {
      res.status(400).json({ success: false, error: "subject is required." });
      return;
    }
    if (cleanSubject.length > 100) {
      res
        .status(400)
        .json({ success: false, error: "subject must be 100 characters or fewer." });
      return;
    }

    const cleanScoreOrGrade = trim(score_or_grade);
    if (!cleanScoreOrGrade) {
      res
        .status(400)
        .json({ success: false, error: "score_or_grade is required." });
      return;
    }
    if (cleanScoreOrGrade.length > 20) {
      res
        .status(400)
        .json({ success: false, error: "score_or_grade must be 20 characters or fewer." });
      return;
    }

    const cleanFeedback = trim(teacher_feedback) ?? null;

    // ── Authorization ─────────────────────────────────────────────────────────
    // Allow if: user is a parent who owns the child, OR user has a teacher/staff role.
    const userRole = req.authUser?.role ?? "";
    const isTeacherOrStaff = ["teacher", "staff", "admin"].includes(userRole.toLowerCase());
    const isParent = await verifyChildAccess(String(child_id), userId);

    if (!isParent && !isTeacherOrStaff) {
      res.status(403).json({
        success: false,
        error:
          "Access denied. You must be the child's parent, or have a teacher/staff role to add records.",
      });
      return;
    }

    // ── Verify Child Exists ───────────────────────────────────────────────────
    const { data: child, error: childError } = await supabase
      .from("children")
      .select("id")
      .eq("id", String(child_id))
      .single();

    if (childError || !child) {
      res.status(404).json({ success: false, error: "Child not found." });
      return;
    }

    // ── Insert Record ─────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("educational_records")
      .insert({
        child_id: String(child_id),
        academic_year: cleanAcademicYear,
        grade_level: cleanGradeLevel,
        subject: cleanSubject,
        score_or_grade: cleanScoreOrGrade,
        teacher_feedback: cleanFeedback,
        logged_by: userId,
      })
      .select(
        `
        id,
        child_id,
        academic_year,
        grade_level,
        subject,
        score_or_grade,
        teacher_feedback,
        logged_by,
        created_at,
        updated_at,
        logger:profiles!educational_records_logged_by_fkey (
          id,
          full_name,
          email
        )
      `
      )
      .single();

    if (error) {
      console.error("Error adding educational record:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to save educational record." });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Academic record added successfully.",
      data: data as unknown as EducationalRecord,
    });
  } catch (err: any) {
    console.error("addAcademicRecord error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/education/:childId
// Returns all educational records for a child, sorted by academic_year DESC,
// then created_at DESC.
// Access: parent of the child, or teacher/staff role.
// ─────────────────────────────────────────────────────────────────────────────
export const getAcademicHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    const childId = String(req.params.childId ?? "");

    if (!childId || !isValidUUID(childId)) {
      res
        .status(400)
        .json({ success: false, error: "A valid childId UUID is required." });
      return;
    }

    // Authorization: parent or teacher/staff
    const userRole = req.authUser?.role ?? "";
    const isTeacherOrStaff = ["teacher", "staff", "admin"].includes(userRole.toLowerCase());
    const isParent = await verifyChildAccess(childId, userId);

    if (!isParent && !isTeacherOrStaff) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only view records for your own children.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("educational_records")
      .select(
        `
        id,
        child_id,
        academic_year,
        grade_level,
        subject,
        score_or_grade,
        teacher_feedback,
        logged_by,
        created_at,
        updated_at,
        logger:profiles!educational_records_logged_by_fkey (
          id,
          full_name,
          email
        )
      `
      )
      .eq("child_id", childId)
      .order("academic_year", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching educational records:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch educational records." });
      return;
    }

    res.status(200).json({
      success: true,
      data: (data ?? []) as unknown as EducationalRecord[],
    });
  } catch (err: any) {
    console.error("getAcademicHistory error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/education/:recordId
// Updates specific fields of an existing educational record.
// Access: the parent of the child, OR the original logger (teacher/staff).
// ─────────────────────────────────────────────────────────────────────────────
export const updateAcademicRecord = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    const recordId = String(req.params.recordId ?? "");

    if (!recordId || !isValidUUID(recordId)) {
      res
        .status(400)
        .json({ success: false, error: "A valid recordId UUID is required." });
      return;
    }

    // ── Fetch the existing record ─────────────────────────────────────────────
    const { data: existing, error: fetchError } = await supabase
      .from("educational_records")
      .select("id, child_id, logged_by")
      .eq("id", recordId)
      .single();

    if (fetchError || !existing) {
      res
        .status(404)
        .json({ success: false, error: "Educational record not found." });
      return;
    }

    // ── Authorization ─────────────────────────────────────────────────────────
    // Allow if: original logger, OR parent of the child, OR admin
    const userRole = req.authUser?.role ?? "";
    const isAdmin = userRole.toLowerCase() === "admin";
    const isOriginalLogger = existing.logged_by === userId;
    const isParent = await verifyChildAccess(existing.child_id, userId);

    if (!isOriginalLogger && !isParent && !isAdmin) {
      res.status(403).json({
        success: false,
        error:
          "Access denied. Only the original recorder or the child's parent may edit this record.",
      });
      return;
    }

    // ── Build Partial Update Payload (only provided fields) ───────────────────
    const {
      academic_year,
      grade_level,
      subject,
      score_or_grade,
      teacher_feedback,
    } = req.body;

    const updatePayload: Record<string, unknown> = {};

    if (academic_year !== undefined) {
      const v = trim(academic_year);
      if (!v || !/^\d{4}-\d{4}$/.test(v)) {
        res.status(400).json({
          success: false,
          error: "academic_year must follow the format 'YYYY-YYYY'.",
        });
        return;
      }
      updatePayload.academic_year = v;
    }

    if (grade_level !== undefined) {
      const v = trim(grade_level);
      if (!v) {
        res
          .status(400)
          .json({ success: false, error: "grade_level cannot be empty." });
        return;
      }
      updatePayload.grade_level = v;
    }

    if (subject !== undefined) {
      const v = trim(subject);
      if (!v || v.length > 100) {
        res.status(400).json({
          success: false,
          error: "subject is required and must be 100 characters or fewer.",
        });
        return;
      }
      updatePayload.subject = v;
    }

    if (score_or_grade !== undefined) {
      const v = trim(score_or_grade);
      if (!v || v.length > 20) {
        res.status(400).json({
          success: false,
          error: "score_or_grade is required and must be 20 characters or fewer.",
        });
        return;
      }
      updatePayload.score_or_grade = v;
    }

    if (teacher_feedback !== undefined) {
      updatePayload.teacher_feedback = trim(teacher_feedback) ?? null;
    }

    if (Object.keys(updatePayload).length === 0) {
      res
        .status(400)
        .json({ success: false, error: "No valid fields provided for update." });
      return;
    }

    // ── Perform Update ────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("educational_records")
      .update(updatePayload)
      .eq("id", recordId)
      .select(
        `
        id,
        child_id,
        academic_year,
        grade_level,
        subject,
        score_or_grade,
        teacher_feedback,
        logged_by,
        created_at,
        updated_at,
        logger:profiles!educational_records_logged_by_fkey (
          id,
          full_name,
          email
        )
      `
      )
      .single();

    if (error) {
      console.error("Error updating educational record:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update educational record." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Academic record updated successfully.",
      data: data as unknown as EducationalRecord,
    });
  } catch (err: any) {
    console.error("updateAcademicRecord error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/education/:recordId
// Permanently removes an academic record.
// Access: original logger, OR parent of the child, OR admin.
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAcademicRecord = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.authUser?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    const recordId = String(req.params.recordId ?? "");

    if (!recordId || !isValidUUID(recordId)) {
      res
        .status(400)
        .json({ success: false, error: "A valid recordId UUID is required." });
      return;
    }

    // ── Fetch record to verify ownership ──────────────────────────────────────
    const { data: existing, error: fetchError } = await supabase
      .from("educational_records")
      .select("id, child_id, logged_by")
      .eq("id", recordId)
      .single();

    if (fetchError || !existing) {
      res
        .status(404)
        .json({ success: false, error: "Educational record not found." });
      return;
    }

    // Authorization: original logger, parent, or admin
    const userRole = req.authUser?.role ?? "";
    const isAdmin = userRole.toLowerCase() === "admin";
    const isOriginalLogger = existing.logged_by === userId;
    const isParent = await verifyChildAccess(existing.child_id, userId);

    if (!isOriginalLogger && !isParent && !isAdmin) {
      res.status(403).json({
        success: false,
        error:
          "Access denied. Only the original recorder or the child's parent may delete this record.",
      });
      return;
    }

    const { error } = await supabase
      .from("educational_records")
      .delete()
      .eq("id", recordId);

    if (error) {
      console.error("Error deleting educational record:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to delete educational record." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Academic record deleted successfully.",
    });
  } catch (err: any) {
    console.error("deleteAcademicRecord error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error." });
  }
};
