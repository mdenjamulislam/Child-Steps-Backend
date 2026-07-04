// ── Shared TypeScript Types ───────────────────────────────────────────────────

export interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  gender: "male" | "female" | "other";
  parent_id: string;
  avatar_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  child_id: string;
  title: string;
  category: MilestoneCategory;
  description?: string;
  is_achieved: boolean;
  achieved_at?: string;
  created_at: string;
  updated_at: string;
}

export type MilestoneCategory =
  | "physical"
  | "cognitive"
  | "language"
  | "social"
  | "emotional"
  | "self_care";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
