import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { verifyChildAccess } from "../utils/childAccess";
import { generateSkillSuggestions } from "../services/skillsAIService";
import type { ChildSkill, SkillStatus } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Compute age in months from a date_of_birth string */
function calculateAgeInMonths(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let months = (now.getFullYear() - dob.getFullYear()) * 12;
  months -= dob.getMonth();
  months += now.getMonth();
  if (now.getDate() < dob.getDate()) months--;
  return months >= 0 ? months : 0;
}

/** Produce a human-readable age label (e.g. "3 years and 4 months") */
function formatAgeLabel(ageInMonths: number): string {
  const years = Math.floor(ageInMonths / 12);
  const months = ageInMonths % 12;
  if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
  if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years} year${years !== 1 ? "s" : ""} and ${months} month${months !== 1 ? "s" : ""}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/skills/generate/:childId
// Triggers AI skill suggestion generation and persists results to child_skills.
// ─────────────────────────────────────────────────────────────────────────────
export const generateSkills = async (
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
      res.status(400).json({ success: false, error: "A valid childId UUID is required." });
      return;
    }

    // ── Authorization: must be the child's parent ────────────────────────────
    const hasAccess = await verifyChildAccess(childId, userId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only generate skills for your own children.",
      });
      return;
    }

    // ── Fetch child profile ──────────────────────────────────────────────────
    const { data: child, error: childError } = await supabase
      .from("children")
      .select("id, first_name, last_name, date_of_birth")
      .eq("id", childId)
      .single();

    if (childError || !child) {
      res.status(404).json({ success: false, error: "Child not found." });
      return;
    }

    const ageInMonths = calculateAgeInMonths(child.date_of_birth);
    const ageLabel = formatAgeLabel(ageInMonths);
    const childName = `${child.first_name} ${child.last_name}`;

    // ── Fetch latest growth record ───────────────────────────────────────────
    const { data: growthRecords } = await supabase
      .from("growth_records")
      .select("weight_kg, height_cm")
      .eq("child_id", childId)
      .order("record_date", { ascending: false })
      .limit(1);

    let physicalMetrics = "No growth data recorded yet";
    if (growthRecords && growthRecords.length > 0) {
      const g = growthRecords[0];
      physicalMetrics = `Weight: ${g.weight_kg} kg, Height: ${g.height_cm} cm`;
    }

    // ── Fetch recent educational records (last 5) ────────────────────────────
    const { data: eduRecords } = await supabase
      .from("educational_records")
      .select("subject, score_or_grade, grade_level")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .limit(5);

    let recentGrades = "No academic records available";
    if (eduRecords && eduRecords.length > 0) {
      recentGrades = eduRecords
        .map((r) => `${r.subject} (${r.grade_level}): ${r.score_or_grade}`)
        .join("; ");
    }

    // ── Fetch recent daily logs (last 7) ─────────────────────────────────────
    const { data: dailyLogs } = await supabase
      .from("daily_logs")
      .select("sleep_hours, mood, physical_activity_minutes, diet_details")
      .eq("child_id", childId)
      .order("log_date", { ascending: false })
      .limit(7);

    let activityHabits = "No daily log data available";
    if (dailyLogs && dailyLogs.length > 0) {
      const avgSleep =
        dailyLogs.reduce((sum, l) => sum + (l.sleep_hours ?? 0), 0) /
        dailyLogs.length;
      const avgActivity =
        dailyLogs.reduce(
          (sum, l) => sum + (l.physical_activity_minutes ?? 0),
          0
        ) / dailyLogs.length;
      const moods = dailyLogs
        .map((l) => l.mood)
        .filter(Boolean)
        .join(", ");
      activityHabits = `Avg sleep: ${avgSleep.toFixed(1)} hrs/night, Avg physical activity: ${avgActivity.toFixed(0)} min/day${moods ? `, Recent moods: ${moods}` : ""}`;
    }

    // ── Call AI service ───────────────────────────────────────────────────────
    const suggestions = await generateSkillSuggestions({
      ageLabel,
      ageInMonths,
      recentGrades,
      activityHabits,
      physicalMetrics,
      childName,
    });

    // ── Persist suggestions to child_skills ──────────────────────────────────
    const inserts = suggestions.map((s) => ({
      child_id: childId,
      skill_name: s.skill_name,
      category: s.category,
      status: "suggested" as const,
      ai_generated: true,
      metadata: {
        rationale: s.rationale,
        recommended_activities: s.recommended_activities,
      },
    }));

    const { data: saved, error: insertError } = await supabase
      .from("child_skills")
      .insert(inserts)
      .select(
        "id, child_id, skill_name, category, status, ai_generated, metadata, created_at, updated_at"
      );

    if (insertError) {
      console.error("Error inserting skill suggestions:", insertError);
      res.status(500).json({
        success: false,
        error: "Failed to save skill suggestions to the database.",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: `Generated ${saved?.length ?? 0} skill suggestion(s) for ${child.first_name}.`,
      data: (saved ?? []) as unknown as ChildSkill[],
    });
  } catch (err: any) {
    console.error("generateSkills error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/skills/:childId
// Returns all skill records for a child grouped by status.
// ─────────────────────────────────────────────────────────────────────────────
export const getChildSkills = async (
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
      res.status(400).json({ success: false, error: "A valid childId UUID is required." });
      return;
    }

    const hasAccess = await verifyChildAccess(childId, userId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only view skills for your own children.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("child_skills")
      .select(
        "id, child_id, skill_name, category, status, ai_generated, metadata, created_at, updated_at"
      )
      .eq("child_id", childId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching child skills:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch skill records." });
      return;
    }

    const skills = (data ?? []) as unknown as ChildSkill[];

    // ── Group by status for convenient frontend consumption ───────────────────
    const grouped = {
      suggested: skills.filter((s) => s.status === "suggested"),
      learning: skills.filter((s) => s.status === "learning"),
      acquired: skills.filter((s) => s.status === "acquired"),
    };

    res.status(200).json({
      success: true,
      data: skills,
      grouped,
    });
  } catch (err: any) {
    console.error("getChildSkills error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/skills/:skillId/status
// Transitions a skill's status (suggested → learning → acquired).
// Only the parent of the child that owns the skill may update it.
// ─────────────────────────────────────────────────────────────────────────────
export const updateSkillStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    const skillId = String(req.params.skillId ?? "");
    if (!skillId || !isValidUUID(skillId)) {
      res.status(400).json({ success: false, error: "A valid skillId UUID is required." });
      return;
    }

    const { status } = req.body;
    const validStatuses: SkillStatus[] = ["suggested", "learning", "acquired"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `status must be one of: ${validStatuses.join(", ")}.`,
      });
      return;
    }

    // ── Fetch the skill to verify ownership via child ──────────────────────
    const { data: existing, error: fetchError } = await supabase
      .from("child_skills")
      .select("id, child_id, status")
      .eq("id", skillId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ success: false, error: "Skill record not found." });
      return;
    }

    const hasAccess = await verifyChildAccess(existing.child_id, userId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only update skills for your own children.",
      });
      return;
    }

    // ── Perform update ─────────────────────────────────────────────────────
    const { data: updated, error: updateError } = await supabase
      .from("child_skills")
      .update({ status })
      .eq("id", skillId)
      .select(
        "id, child_id, skill_name, category, status, ai_generated, metadata, created_at, updated_at"
      )
      .single();

    if (updateError) {
      console.error("Error updating skill status:", updateError);
      res
        .status(500)
        .json({ success: false, error: "Failed to update skill status." });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Skill status updated to '${status}' successfully.`,
      data: updated as unknown as ChildSkill,
    });
  } catch (err: any) {
    console.error("updateSkillStatus error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error." });
  }
};
