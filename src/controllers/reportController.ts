import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { verifyChildAccess } from "../utils/childAccess";
import type { ProgressReportSummary } from "../types";

export const getReportSummary = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const childId = String(req.params.childId ?? "");

    const parentId = req.authUser?.profile?.id;
    if (!parentId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    // 1. Verify access
    const hasAccess = await verifyChildAccess(childId, parentId);
    if (!hasAccess) {
      res.status(403).json({ success: false, error: "Forbidden: You do not have access to this child." });
      return;
    }

    // Fetch child basic info
    const { data: child, error: childError } = await supabase
      .from("children")
      .select("id, first_name")
      .eq("id", childId)
      .single();

    if (childError || !child) {
      res.status(404).json({ success: false, error: "Child not found." });
      return;
    }

    const report: ProgressReportSummary = {
      childId: child.id,
      childName: child.first_name,
      growth: {
        startWeight: null,
        startHeight: null,
        latestWeight: null,
        latestHeight: null,
        weightGain: null,
        heightGain: null,
        bmi: null,
      },
      routines: {
        avgSleepOver30Days: 0,
        avgActivityOver30Days: 0,
        mostCommonMood: "neutral",
        dailyData: [],
      },
      academics: {
        avgScore: null,
        subjectScores: [],
      },
      vaccinations: {
        totalScheduled: 0,
        totalAdministered: 0,
        percentComplete: 0,
      },
      skills: {
        totalAcquired: 0,
        totalLearning: 0,
        totalSuggested: 0,
      },
    };

    // ── 2. Growth Summary ────────────────────────────────────────────────────
    const { data: growthData } = await supabase
      .from("growth_records")
      .select("date, height_cm, weight_kg")
      .eq("child_id", childId)
      .order("date", { ascending: true }); // Oldest first

    if (growthData && growthData.length > 0) {
      const first = growthData[0];
      const last = growthData[growthData.length - 1];

      report.growth.startWeight = first.weight_kg;
      report.growth.startHeight = first.height_cm;
      report.growth.latestWeight = last.weight_kg;
      report.growth.latestHeight = last.height_cm;

      if (first.weight_kg && last.weight_kg) {
        report.growth.weightGain = Number((last.weight_kg - first.weight_kg).toFixed(2));
      }
      if (first.height_cm && last.height_cm) {
        report.growth.heightGain = Number((last.height_cm - first.height_cm).toFixed(2));
      }
      if (last.weight_kg && last.height_cm && last.height_cm > 0) {
        // BMI = weight(kg) / (height(m))^2
        const heightM = last.height_cm / 100;
        report.growth.bmi = Number((last.weight_kg / (heightM * heightM)).toFixed(1));
      }
    }

    // ── 3. Routine Summary (Past 30 Days) ────────────────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimit = thirtyDaysAgo.toISOString().split("T")[0];

    const { data: routineData } = await supabase
      .from("daily_logs")
      .select("log_date, sleep_hours, physical_activity_minutes, mood")
      .eq("child_id", childId)
      .gte("log_date", dateLimit)
      .order("log_date", { ascending: true });

    if (routineData && routineData.length > 0) {
      let totalSleep = 0;
      let totalActivity = 0;
      const moodCounts: Record<string, number> = {};

      routineData.forEach((log) => {
        totalSleep += log.sleep_hours || 0;
        totalActivity += log.physical_activity_minutes || 0;

        if (log.mood) {
          moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
        }

        report.routines.dailyData.push({
          date: log.log_date,
          sleep: log.sleep_hours || 0,
          activity: log.physical_activity_minutes || 0,
        });
      });

      report.routines.avgSleepOver30Days = Number((totalSleep / routineData.length).toFixed(1));
      report.routines.avgActivityOver30Days = Math.round(totalActivity / routineData.length);

      let maxMoodCount = 0;
      for (const [mood, count] of Object.entries(moodCounts)) {
        if (count > maxMoodCount) {
          maxMoodCount = count;
          report.routines.mostCommonMood = mood;
        }
      }
    }

    // ── 4. Academic Performance ──────────────────────────────────────────────
    // Assuming score_or_grade can be numeric or a letter. We'll parse numbers if possible.
    const { data: academicData } = await supabase
      .from("educational_records")
      .select("subject, score_or_grade")
      .eq("child_id", childId);

    if (academicData && academicData.length > 0) {
      let totalScore = 0;
      let validScores = 0;

      academicData.forEach((rec) => {
        if (rec.score_or_grade && rec.subject) {
          // Attempt to extract numeric score out of string (e.g. "85/100" -> 85, or "92" -> 92)
          const numMatch = rec.score_or_grade.match(/\d+/);
          if (numMatch) {
            const score = parseInt(numMatch[0], 10);
            totalScore += score;
            validScores++;
            report.academics.subjectScores.push({ subject: rec.subject, score });
          }
        }
      });

      if (validScores > 0) {
        report.academics.avgScore = Number((totalScore / validScores).toFixed(1));
      }
    }

    // ── 5. Vaccination Progress ──────────────────────────────────────────────
    const { data: vaxData } = await supabase
      .from("vaccination_records")
      .select("status")
      .eq("child_id", childId);

    if (vaxData && vaxData.length > 0) {
      report.vaccinations.totalScheduled = vaxData.length;
      report.vaccinations.totalAdministered = vaxData.filter((v) => v.status === "administered").length;
      report.vaccinations.percentComplete = Math.round(
        (report.vaccinations.totalAdministered / report.vaccinations.totalScheduled) * 100
      );
    }

    // ── 6. Skill Mastery ─────────────────────────────────────────────────────
    const { data: skillsData } = await supabase
      .from("child_skills")
      .select("status")
      .eq("child_id", childId);

    if (skillsData && skillsData.length > 0) {
      report.skills.totalAcquired = skillsData.filter((s) => s.status === "acquired").length;
      report.skills.totalLearning = skillsData.filter((s) => s.status === "learning").length;
      report.skills.totalSuggested = skillsData.filter((s) => s.status === "suggested").length;
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error("Error generating report summary:", error);
    res.status(500).json({ success: false, error: error.message || "Internal server error." });
  }
};
