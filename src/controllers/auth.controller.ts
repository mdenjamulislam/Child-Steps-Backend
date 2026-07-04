import { Request, Response } from "express";
import { supabase } from "../config/supabase";

// POST /api/auth/register
export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password, full_name } = req.body;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
      email_confirm: true,
    });

    if (error) throw error;
    res.status(201).json({ success: true, data: { user: data.user } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message });
  }
};

// POST /api/auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
