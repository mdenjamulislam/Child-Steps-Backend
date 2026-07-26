import { Request, Response } from "express";
import { supabase } from "../config/supabase";

// GET /api/children
export const getAllChildren = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userRole = req.authUser?.role;
    let query = supabase
      .from("children")
      .select("*")
      .order("created_at", { ascending: false });

    if (userRole !== "admin" && userRole !== "super_admin" && userRole !== "staff") {
      query = query.eq("parent_id", req.authUser?.id);
    }

    const { data, error } = await query;

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
    const userRole = req.authUser?.role;
    let query = supabase
      .from("children")
      .select("*, milestones(*)")
      .eq("id", req.params.id);

    if (userRole !== "admin" && userRole !== "super_admin" && userRole !== "staff") {
      query = query.eq("parent_id", req.authUser?.id);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ success: false, error: "Child not found or access denied" });
        return;
      }
      throw error;
    }
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
    const { first_name, last_name, date_of_birth, gender, blood_group } = req.body;
    const parent_id = req.authUser?.id;

    if (!parent_id) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const { data, error } = await supabase
      .from("children")
      .insert([{ first_name, last_name, date_of_birth, gender, blood_group, parent_id }])
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
    const userRole = req.authUser?.role;
    const { first_name, last_name, date_of_birth, gender, blood_group } = req.body;

    // Verify ownership first
    const { data: child, error: childError } = await supabase
      .from("children")
      .select("parent_id")
      .eq("id", req.params.id)
      .single();

    if (childError || !child) {
      res.status(404).json({ success: false, error: "Child not found" });
      return;
    }

    if (
      child.parent_id !== req.authUser?.id &&
      userRole !== "admin" &&
      userRole !== "super_admin" &&
      userRole !== "staff"
    ) {
      res.status(403).json({ success: false, error: "Forbidden: Not the owner" });
      return;
    }

    const { data, error } = await supabase
      .from("children")
      .update({ first_name, last_name, date_of_birth, gender, blood_group })
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
    const userRole = req.authUser?.role;

    const { data: child, error: childError } = await supabase
      .from("children")
      .select("parent_id")
      .eq("id", req.params.id)
      .single();

    if (childError || !child) {
      res.status(404).json({ success: false, error: "Child not found" });
      return;
    }

    if (
      child.parent_id !== req.authUser?.id &&
      userRole !== "admin" &&
      userRole !== "super_admin" &&
      userRole !== "staff"
    ) {
      res.status(403).json({ success: false, error: "Forbidden: Not the owner" });
      return;
    }

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
