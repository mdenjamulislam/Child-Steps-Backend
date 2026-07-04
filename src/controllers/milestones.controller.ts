import { Request, Response } from "express";
import { supabase } from "../config/supabase";

// GET /api/milestones?child_id=xxx
export const getMilestones = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let query = supabase
      .from("milestones")
      .select("*")
      .order("achieved_at", { ascending: false });

    if (req.query.child_id) {
      query = query.eq("child_id", req.query.child_id as string);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/milestones/:id
export const getMilestoneById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("milestones")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ success: false, error: "Milestone not found" });
      return;
    }
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/milestones
export const createMilestone = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { child_id, title, category, description, achieved_at, is_achieved } =
      req.body;

    const { data, error } = await supabase
      .from("milestones")
      .insert([{ child_id, title, category, description, achieved_at, is_achieved }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/milestones/:id
export const updateMilestone = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("milestones")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/milestones/:id
export const deleteMilestone = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("milestones")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true, message: "Milestone deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
