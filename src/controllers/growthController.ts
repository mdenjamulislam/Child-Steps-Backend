import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { verifyChildAccess } from "../utils/childAccess";

/**
 * POST /api/growth
 * Add a new growth measurement record for a child.
 * Calculates BMI automatically using formula: BMI = weight_kg / (height_cm / 100)^2
 */
export const addGrowthRecord = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      child_id,
      weight_kg,
      height_cm,
      head_circumference_cm,
      record_date,
    } = req.body;

    const userId = req.authUser?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized access." });
      return;
    }

    if (!child_id) {
      res.status(400).json({ success: false, error: "child_id is required." });
      return;
    }

    const weight = Number(weight_kg);
    const height = Number(height_cm);

    if (isNaN(weight) || weight <= 0) {
      res.status(400).json({
        success: false,
        error: "weight_kg must be a positive number.",
      });
      return;
    }

    if (isNaN(height) || height <= 0) {
      res.status(400).json({
        success: false,
        error: "height_cm must be a positive number.",
      });
      return;
    }

    // Authorization check: parent must own the child record
    const hasAccess = await verifyChildAccess(child_id, userId);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only manage growth records for your own children.",
      });
      return;
    }

    // Calculate BMI: weight (kg) / (height (m))^2
    const heightMeters = height / 100;
    const bmi = Number((weight / (heightMeters * heightMeters)).toFixed(2));

    const headCircumference =
      head_circumference_cm !== undefined && head_circumference_cm !== null
        ? Number(head_circumference_cm)
        : null;

    const targetDate =
      record_date || new Date().toISOString().split("T")[0];

    const growthData = {
      child_id,
      record_date: targetDate,
      weight_kg: weight,
      height_cm: height,
      head_circumference_cm: headCircumference,
      bmi,
    };

    const { data, error } = await supabase
      .from("growth_records")
      .insert([growthData])
      .select()
      .single();

    if (error) {
      console.error("Error inserting growth record:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to save growth record." });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Growth record added successfully.",
      data,
    });
  } catch (error: any) {
    console.error("Add growth record error:", error);
    res
      .status(500)
      .json({ success: false, error: error.message || "Internal server error." });
  }
};

/**
 * GET /api/growth/:childId
 * Retrieves all growth history records for a specific child, sorted by record_date ASC.
 */
export const getGrowthHistory = async (
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
        error: "Access denied. You can only view growth records for your own children.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("growth_records")
      .select("*")
      .eq("child_id", childId)
      .order("record_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching growth history:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch growth history." });
      return;
    }

    res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error("Get growth history error:", error);
    res
      .status(500)
      .json({ success: false, error: error.message || "Internal server error." });
  }
};
