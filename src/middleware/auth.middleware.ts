import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import type { AuthUser, ProfileWithRoleAndPermissions } from "../types";

// ── Extend Express Request ────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

// ── Helper: Fetch full profile with role + permissions ────────────────────────
async function fetchProfileWithPermissions(
  userId: string
): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      full_name,
      role_id,
      created_at,
      updated_at,
      roles (
        id,
        name,
        description,
        created_at,
        role_permissions (
          permissions (
            id,
            name,
            description,
            created_at
          )
        )
      )
    `
    )
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  const row = data as unknown as ProfileWithRoleAndPermissions;

  const permissions: string[] =
    row.roles?.role_permissions?.map((rp) => rp.permissions.name) ?? [];

  return {
    id: row.id,
    email: row.email,
    profile: {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      role_id: row.role_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      role: row.roles,
      permissions,
    },
    role: row.roles?.name ?? "unknown",
    permissions,
  };
}

// ── Middleware: requireAuth ────────────────────────────────────────────────────
/**
 * Verifies the Bearer JWT from the Authorization header using Supabase Auth.
 * On success, attaches `req.authUser` with the full profile + permissions.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ success: false, error: "No authorization token provided." });
    return;
  }

  const token = authHeader.split(" ")[1];

  // Verify token with Supabase (service role key validates any user's JWT)
  const { data: authData, error: authError } =
    await supabase.auth.getUser(token);

  if (authError || !authData?.user) {
    res
      .status(401)
      .json({ success: false, error: "Invalid or expired token." });
    return;
  }

  // Fetch profile with role + permissions
  const authUser = await fetchProfileWithPermissions(authData.user.id);

  if (!authUser) {
    res.status(403).json({
      success: false,
      error: "User profile not found. Account may be incomplete.",
    });
    return;
  }

  req.authUser = authUser;
  next();
};

// ── Middleware Factory: requirePermission ─────────────────────────────────────
/**
 * Returns a middleware that checks if the authenticated user's role
 * has the specified permission. Must be used AFTER `requireAuth`.
 *
 * @param permissionName - e.g. 'manage_users', 'edit_vaccines'
 */
export const requirePermission = (permissionName: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.authUser) {
      res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
      return;
    }

    const hasPermission = req.authUser.permissions.includes(permissionName);

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required permission: '${permissionName}'.`,
        requiredPermission: permissionName,
        currentRole: req.authUser.role,
      });
      return;
    }

    next();
  };
};
