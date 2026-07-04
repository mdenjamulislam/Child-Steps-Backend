import { Request, Response } from "express";
import { supabase } from "../config/supabase";

// GET /api/children
export const getAllChildren = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/children/:id
export const getChildById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("children")
      .select("*, milestones(*)")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ success: false, error: "Child not found" });
      return;
    }
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/children
export const createChild = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, date_of_birth, gender, parent_id, avatar_url, notes } =
      req.body;

    const { data, error } = await supabase
      .from("children")
      .insert([{ name, date_of_birth, gender, parent_id, avatar_url, notes }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/children/:id
export const updateChild = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("children")
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

// DELETE /api/children/:id
export const deleteChild = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("children")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true, message: "Child deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
