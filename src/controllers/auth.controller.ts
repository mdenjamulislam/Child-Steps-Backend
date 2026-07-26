import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import type {
  SignupPayload,
  LoginPayload,
  ApiResponse,
  ProfileRow,
  RoleRow,
  ProfileWithRoleAndPermissions,
} from "../types";

// ── Validation Helpers ────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignupBody(body: unknown): {
  valid: boolean;
  error?: string;
  payload?: SignupPayload;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required." };
  }
  const { email, password, full_name, role_name } = body as Record<
    string,
    unknown
  >;

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "A valid email address is required." };
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long.",
    };
  }
  if (!full_name || typeof full_name !== "string" || full_name.trim() === "") {
    return { valid: false, error: "Full name is required." };
  }
  if (!role_name || typeof role_name !== "string" || role_name.trim() === "") {
    return { valid: false, error: "A role name is required." };
  }

  return {
    valid: true,
    payload: {
      email: email.toLowerCase().trim(),
      password,
      full_name: full_name.trim(),
      role_name: role_name.toLowerCase().trim(),
    },
  };
}

function validateLoginBody(body: unknown): {
  valid: boolean;
  error?: string;
  payload?: LoginPayload;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required." };
  }
  const { email, password } = body as Record<string, unknown>;

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "A valid email address is required." };
  }
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required." };
  }

  return {
    valid: true,
    payload: {
      email: email.toLowerCase().trim(),
      password,
    },
  };
}

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
/**
 * Registers a new user in Supabase Auth and creates a profile record.
 * Body: { email, password, full_name, role_name }
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
  // 1. Validate request body
  const validation = validateSignupBody(req.body);
  if (!validation.valid || !validation.payload) {
    const response: ApiResponse<null> = {
      success: false,
      error: validation.error,
    };
    res.status(400).json(response);
    return;
  }

  const { email, password, full_name, role_name } = validation.payload;

  try {
    // 2. Look up role_id from public.roles table
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id, name")
      .eq("name", role_name)
      .single();

    if (roleError || !roleData) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Role '${role_name}' does not exist. Valid roles: parent, teacher, guardian.`,
      };
      res.status(400).json(response);
      return;
    }

    const role = roleData as RoleRow;

    // 3. Create user in Supabase Auth (admin.createUser bypasses email confirmation for dev)
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { full_name, role_name: role.name },
        email_confirm: true, // auto-confirm — remove in production if email verification needed
      });

    if (authError || !authData?.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: authError?.message ?? "Failed to create user account.",
      };
      res.status(400).json(response);
      return;
    }

    const authUser = authData.user;

    // 4. Insert into public.profiles
    const profileInsert: Omit<ProfileRow, "created_at" | "updated_at"> = {
      id: authUser.id,
      email,
      full_name,
      role_id: role.id,
    };

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .insert(profileInsert)
      .select("id, email, full_name, role_id, created_at")
      .single();

    if (profileError) {
      // Rollback: delete the auth user if profile insert fails
      await supabase.auth.admin.deleteUser(authUser.id);
      const response: ApiResponse<null> = {
        success: false,
        error: "Failed to create user profile. Please try again.",
      };
      res.status(500).json(response);
      return;
    }

    // 5. Return success (no token — user must login separately)
    const response: ApiResponse<{
      user: { id: string; email: string; full_name: string; role: string };
    }> = {
      success: true,
      message: "Account created successfully. You can now log in.",
      data: {
        user: {
          id: authUser.id,
          email: (profileData as ProfileRow).email,
          full_name: (profileData as ProfileRow).full_name,
          role: role.name,
        },
      },
    };
    res.status(201).json(response);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    const response: ApiResponse<null> = {
      success: false,
      error: errorMessage,
    };
    res.status(500).json(response);
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
/**
 * Authenticates credentials against Supabase Auth.
 * Returns access token, user metadata, and resolved role name.
 * Body: { email, password }
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const validation = validateLoginBody(req.body);
  if (!validation.valid || !validation.payload) {
    const response: ApiResponse<null> = {
      success: false,
      error: validation.error,
    };
    res.status(400).json(response);
    return;
  }

  const { email, password } = validation.payload;

  try {
    // 1. Sign in with Supabase Auth
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData?.user || !signInData?.session) {
      const response: ApiResponse<null> = {
        success: false,
        error: "Invalid email or password.",
      };
      res.status(401).json(response);
      return;
    }

    const authUser = signInData.user;
    const session = signInData.session;

    // 2. Fetch profile with role + permissions
    const { data: profileData, error: profileError } = await supabase
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
      .eq("id", authUser.id)
      .single();

    if (profileError || !profileData) {
      const response: ApiResponse<null> = {
        success: false,
        error:
          "User profile not found. Your account may be incomplete — please contact support.",
      };
      res.status(404).json(response);
      return;
    }

    const profile = profileData as unknown as ProfileWithRoleAndPermissions;

    const permissions: string[] =
      profile.roles?.role_permissions?.map((rp) => rp.permissions.name) ?? [];

    // 3. Return token + enriched user data
    const response: ApiResponse<{
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      user: {
        id: string;
        email: string;
        full_name: string;
        role: string;
        role_id: string;
        permissions: string[];
        created_at: string;
      };
    }> = {
      success: true,
      message: "Login successful.",
      data: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at ?? 0,
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.roles?.name ?? "unknown",
          role_id: profile.role_id,
          permissions,
          created_at: profile.created_at,
        },
      },
    };

    res.status(200).json(response);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    const response: ApiResponse<null> = {
      success: false,
      error: errorMessage,
    };
    res.status(500).json(response);
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
/**
 * Protected endpoint — requires requireAuth middleware.
 * Returns the caller's complete profile, role, and permissions list.
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  // authUser is attached by the requireAuth middleware
  const authUser = req.authUser;

  if (!authUser) {
    const response: ApiResponse<null> = {
      success: false,
      error: "Not authenticated.",
    };
    res.status(401).json(response);
    return;
  }

  const response: ApiResponse<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    role_id: string;
    permissions: string[];
    created_at: string;
    updated_at: string;
  }> = {
    success: true,
    data: {
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.profile.full_name,
      role: authUser.role,
      role_id: authUser.profile.role_id,
      permissions: authUser.permissions,
      created_at: authUser.profile.created_at,
      updated_at: authUser.profile.updated_at,
    },
  };

  res.status(200).json(response);
};
