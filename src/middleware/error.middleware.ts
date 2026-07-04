import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("❌ Unhandled Error:", err.stack);
  res.status(500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
};
