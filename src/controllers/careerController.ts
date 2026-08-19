import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { verifyChildAccess } from "../utils/childAccess";
import { generateCareerGuidanceFromAI } from "../services/careerService";
import type { CareerGuidanceRecord } from "../types";

// -- Helper: validate UUID format ----------------------------------------------
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

// -- Helper: calculate age in years --------------------------------------------
function calculateAgeInYears(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

// -- Helper: extract numeric score from grade string ---------------------------
function parseScore(scoreStr: string): number | null {
  const match = scoreStr.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * POST /api/career/generate/:childId
 *
 * Retrieves the child's academic records and skills, builds an OpenRouter
 * prompt, saves the structured career guidance to the DB, and returns it.
 */
export const generateCareerRoadmap = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const childId = String(req.params.childId ?? "");
    const parentId = req.authUser?.id;

    // -- 1. Auth checks ---------------------------------------------------------
    if (!parentId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    if (!childId || !isValidUUID(childId)) {
      res
        .status(400)
        .json({ success: false, error: "A valid childId UUID is required." });
      return;
    }

    // -- 2. Verify parent-child ownership --------------------------------------
    const hasAccess = await verifyChildAccess(childId, parentId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error:
          "Access denied. You can only generate career guidance for your own children.",
      });
      return;
    }

    // -- 3. Fetch child profile ------------------------------------------------
    const { data: child, error: childError } = await supabase
      .from("children")
      .select("id, first_name, date_of_birth")
      .eq("id", childId)
      .single();

    if (childError || !child || !child.date_of_birth) {
      res
        .status(404)
        .json({ success: false, error: "Child not found or missing date of birth." });
      return;
    }

    const ageYears = calculateAgeInYears(child.date_of_birth);

    // -- 4. Fetch top academic subjects ----------------------------------------
    const { data: eduRecords } = await supabase
      .from("educational_records")
      .select("subject, score_or_grade")
      .eq("child_id", childId);

    // Aggregate scores per subject (average) and pick top 5
    const subjectMap = new Map<string, { total: number; count: number }>();
    if (eduRecords) {
      for (const rec of eduRecords) {
        if (!rec.subject) continue;
        const score = parseScore(rec.score_or_grade ?? "");
        if (score === null) continue;

        const existing = subjectMap.get(rec.subject) ?? { total: 0, count: 0 };
        existing.total += score;
        existing.count += 1;
        subjectMap.set(rec.subject, existing);
      }
    }

    const topSubjects = Array.from(subjectMap.entries())
      .map(([subject, { total, count }]) => ({
        subject,
        score: Math.round(total / count),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // -- 5. Fetch acquired skill tags ------------------------------------------
    const { data: skillsData } = await supabase
      .from("child_skills")
      .select("skill_name, status")
      .eq("child_id", childId)
      .in("status", ["acquired", "learning"]);

    const acquiredSkills = (skillsData ?? []).map((s) => s.skill_name);

    // -- 6. Call AI service ----------------------------------------------------
    const aiResult = await generateCareerGuidanceFromAI({
      ageYears,
      topSubjects,
      acquiredSkills,
    });

    // -- 7. Persist to DB ------------------------------------------------------
    const { data: savedRecord, error: insertError } = await supabase
      .from("career_guidance")
      .insert({
        child_id: childId,
        recommended_path: aiResult.recommended_path,
        rationale: aiResult.rationale,
        action_steps: aiResult.action_steps,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !savedRecord) {
      console.error("DB insert error for career_guidance:", insertError);
      res.status(500).json({
        success: false,
        error: "Failed to save career guidance record.",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Career roadmap generated successfully.",
      data: savedRecord as CareerGuidanceRecord,
    });
  } catch (err: any) {
    console.error("generateCareerRoadmap error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error." });
  }
};

/**
 * GET /api/career/:childId
 *
 * Retrieves the saved career guidance history for a specific child,
 * ordered by most recently generated first.
 */
export const getCareerHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const childId = String(req.params.childId ?? "");
    const parentId = req.authUser?.id;

    // -- 1. Auth checks ---------------------------------------------------------
    if (!parentId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    if (!childId || !isValidUUID(childId)) {
      res
        .status(400)
        .json({ success: false, error: "A valid childId UUID is required." });
      return;
    }

    // -- 2. Verify parent-child ownership --------------------------------------
    const hasAccess = await verifyChildAccess(childId, parentId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only view career records for your own children.",
      });
      return;
    }

    // -- 3. Fetch history ordered by most recent -------------------------------
    const { data: records, error: fetchError } = await supabase
      .from("career_guidance")
      .select("*")
      .eq("child_id", childId)
      .order("generated_at", { ascending: false })
      .limit(10);

    if (fetchError) {
      console.error("DB fetch error for career_guidance:", fetchError);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve career guidance history.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: (records ?? []) as CareerGuidanceRecord[],
    });
  } catch (err: any) {
    console.error("getCareerHistory error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error." });
  }
};
