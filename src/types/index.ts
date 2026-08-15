// ── Shared TypeScript Types ───────────────────────────────────────────────────

import { Request } from "express";

// ── RBAC / Auth Types ────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  created_at: string;
  updated_at: string;
  // Joined fields (optional, populated via query)
  role?: Role;
  permissions?: string[];
}

/** The authenticated user object attached to req by requireAuth */
export interface AuthUser {
  id: string;
  email: string;
  profile: Profile;
  role: string;         // role name e.g. 'parent'
  permissions: string[]; // permission names e.g. ['view_children', 'edit_profile']
}

// ── Request Payload Types ────────────────────────────────────────────────────

export type PublicRoleName = "parent" | "teacher" | "guardian";

export interface SignupPayload {
  email: string;
  password: string;
  full_name: string;
  role_name: PublicRoleName | string; // allow all role names for admin use
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ── Express Request Augmentation ─────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  authUser: AuthUser;
}

// ── Database Row Shapes ───────────────────────────────────────────────────────

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface PermissionRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  created_at: string;
  updated_at: string;
}

/** Result of joining profiles → roles → role_permissions → permissions */
export interface ProfileWithRoleAndPermissions extends ProfileRow {
  roles: RoleRow & {
    role_permissions: Array<{
      permissions: PermissionRow;
    }>;
  };
}

// ── API Response ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── Domain Types ──────────────────────────────────────────────────────────────

export interface Child {
  id: string;
  parent_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: "male" | "female" | "other";
  blood_group?: string;
  created_at: string;
  updated_at: string;
}

export interface GrowthRecord {
  id: string;
  child_id: string;
  record_date: string;
  weight_kg: number;
  height_cm: number;
  head_circumference_cm?: number | null;
  bmi: number;
  created_at: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  target_age_months: number;
  category: "Cognitive" | "Motor Skills" | "Language" | "Social-Emotional";
}

export interface ChildMilestone {
  id: string;
  child_id: string;
  milestone_id: string;
  achieved_date?: string | null;
  status: "not-started" | "in-progress" | "achieved";
  notes?: string | null;
  created_at: string;
}

export type MilestoneCategory =
  | "Cognitive"
  | "Motor Skills"
  | "Language"
  | "Social-Emotional";

// ── Vaccination Types ────────────────────────────────────────────────────────

export interface Vaccine {
  id: string;
  name: string;
  description: string | null;
  recommended_age_months: number;
  doses_required: number;
  created_at: string;
}

export type VaccinationStatus = "scheduled" | "administered" | "skipped";

export interface VaccinationRecord {
  id: string;
  child_id: string;
  vaccine_id: string;
  scheduled_date: string;
  status: VaccinationStatus;
  administered_date: string | null;
  administered_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined from vaccines table
  vaccine?: Vaccine;
}

// ── Guidelines / AI Types ────────────────────────────────────────────────────

export interface GuidelineResponse {
  physical_activity: string[];
  nutrition: string[];
  cognitive_focus: string[];
  sleep_recommendations: string[];
}
