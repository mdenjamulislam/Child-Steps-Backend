import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { verifyChildAccess } from "../utils/childAccess";
import { generateParentGuidelines } from "../services/aiService";
import type { GuidelineResponse } from "../types";

// Simple in-memory cache to store generated guidelines
// Key: childId, Value: { data: GuidelineResponse, timestamp: number }
const guidelinesCache = new Map<string, { data: GuidelineResponse; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper: validate UUID format
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Helper: calculate exact age in months
function calculateAgeInMonths(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let months = (now.getFullYear() - dob.getFullYear()) * 12;
  months -= dob.getMonth();
  months += now.getMonth();
  if (now.getDate() < dob.getDate()) {
    months--;
  }
  return months >= 0 ? months : 0;
}

/**
 * GET /api/guidelines/:childId
 * Generates or retrieves cached age-based developmental guidelines for a child.
 */
export const getGuidelines = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const childId = String(req.params.childId ?? "");
    const userId = req.authUser?.id;
    const forceRefresh = req.query.refresh === 'true';

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
        error: "Access denied. You can only view guidelines for your own children.",
      });
      return;
    }

    // Check cache first (if not forcing a refresh)
    if (!forceRefresh && guidelinesCache.has(childId)) {
      const cached = guidelinesCache.get(childId)!;
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        res.status(200).json({ success: true, data: cached.data });
        return;
      }
    }

    // Fetch the child's date_of_birth to calculate exact age
    const { data: child, error: childError } = await supabase
      .from("children")
      .select("date_of_birth")
      .eq("id", childId)
      .single();

    if (childError || !child || !child.date_of_birth) {
      res.status(404).json({ success: false, error: "Child not found or missing date of birth." });
      return;
    }

    const ageInMonths = calculateAgeInMonths(child.date_of_birth);

    // Fetch the most recent growth record for context
    const { data: growthRecords, error: growthError } = await supabase
      .from("growth_records")
      .select("weight_kg, height_cm")
      .eq("child_id", childId)
      .order("record_date", { ascending: false })
      .limit(1);

    let latestWeight: number | undefined;
    let latestHeight: number | undefined;

    if (!growthError && growthRecords && growthRecords.length > 0) {
      latestWeight = growthRecords[0].weight_kg;
      latestHeight = growthRecords[0].height_cm;
    }

    // Call AI Service
    const guidelines = await generateParentGuidelines(ageInMonths, latestWeight, latestHeight);

    // Update Cache
    guidelinesCache.set(childId, {
      data: guidelines,
      timestamp: Date.now(),
    });

    res.status(200).json({
      success: true,
      data: guidelines,
    });
  } catch (err: any) {
    console.error("getGuidelines error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
};
