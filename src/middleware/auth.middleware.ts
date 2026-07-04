import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
    return;
  }

  // Attach user to request object (extend Request type if needed)
  (req as any).user = data.user;
  next();
};
