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

// ── Educational Record Types ──────────────────────────────────────────────────

export interface LoggerProfile {
  id: string;
  full_name: string;
  email: string;
}

export interface EducationalRecord {
  id: string;
  child_id: string;
  academic_year: string;    // e.g. '2025-2026'
  grade_level: string;      // e.g. 'Grade 3'
  subject: string;          // e.g. 'Mathematics'
  score_or_grade: string;   // e.g. '92%' or 'A'
  teacher_feedback: string | null;
  logged_by: string;        // UUID of the user who created this record
  created_at: string;
  updated_at: string;
  // Joined from profiles table via logged_by FK
  logger?: LoggerProfile;
}

// ── Skill Development Types (Module 8) ───────────────────────────────────────

export type SkillCategory =
  | 'academic'
  | 'artistic'
  | 'athletic'
  | 'social'
  | 'technical';

export type SkillStatus = 'suggested' | 'learning' | 'acquired';

export interface ChildSkillMetadata {
  rationale: string;
  recommended_activities: string[];
}

export interface ChildSkill {
  id: string;
  child_id: string;
  skill_name: string;
  category: SkillCategory;
  status: SkillStatus;
  ai_generated: boolean;
  metadata: ChildSkillMetadata;
  created_at: string;
  updated_at: string;
}

/** Shape of a single suggestion returned by the AI before DB insert */
export interface AISuggestedSkill {
  skill_name: string;
  category: SkillCategory;
  rationale: string;
  recommended_activities: string[];
}

// ── Notifications and Alerts Types (Module 9) ────────────────────────────────

export type NotificationType =
  | 'vaccine_reminder'
  | 'milestone_alert'
  | 'educational_update'
  | 'system_notice';

export interface NotificationRecord {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  message: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// ── Career Development Types (Module 11) ─────────────────────────────────────

export type CareerDifficulty = "Beginner" | "Intermediate" | "Advanced";

export interface CareerActionStep {
  title: string;
  description: string;
  difficulty: CareerDifficulty;
}

export interface CareerGuidanceRecord {
  id: string;
  child_id: string;
  recommended_path: string;
  rationale: string;
  action_steps: CareerActionStep[];
  generated_at: string;
  created_at: string;
  updated_at: string;
}

// ── Progress Reports Types (Module 10) ───────────────────────────────────────

export interface ProgressReportSummary {
  childId: string;
  childName: string;
  growth: {
    startWeight: number | null;
    startHeight: number | null;
    latestWeight: number | null;
    latestHeight: number | null;
    weightGain: number | null;
    heightGain: number | null;
    bmi: number | null;
  };
  routines: {
    avgSleepOver30Days: number;
    avgActivityOver30Days: number;
    mostCommonMood: string;
    dailyData: { date: string; sleep: number; activity: number }[];
  };
  academics: {
    avgScore: number | null;
    subjectScores: { subject: string; score: number }[];
  };
  vaccinations: {
    totalScheduled: number;
    totalAdministered: number;
    percentComplete: number;
  };
  skills: {
    totalAcquired: number;
    totalLearning: number;
    totalSuggested: number;
  };
}
