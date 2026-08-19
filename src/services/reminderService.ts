import { supabase } from "../config/supabase";
import type { NotificationType } from "../types";

// Helper to compute age in months
function calculateAgeInMonths(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let months = (now.getFullYear() - dob.getFullYear()) * 12;
  months -= dob.getMonth();
  months += now.getMonth();
  if (now.getDate() < dob.getDate()) months--;
  return months >= 0 ? months : 0;
}

/**
 * Core Background Routine for Module 9: Notifications and Alerts.
 *
 * 1. Vaccine Check: Finds vaccines due in the next 7 days.
 * 2. Milestone Check: Finds unachieved milestones matching the child's current age.
 *
 * Avoids duplicates via reference_id.
 *
 * @param specificProfileId Optional. If provided, limits the check to one parent.
 */
export async function generateSystemNotifications(
  specificProfileId?: string
): Promise<{ generated: number }> {
  let newAlertsCount = 0;

  try {
    // ── Fetch all children with their parent profile ───────────────────────
    let query = supabase.from("children").select("id, first_name, date_of_birth, parent_id");
    if (specificProfileId) {
      query = query.eq("parent_id", specificProfileId);
    }

    const { data: children, error: childError } = await query;

    if (childError || !children) {
      console.error("Failed to fetch children for background check", childError);
      return { generated: 0 };
    }

    // Process each child
    for (const child of children) {
      const ageInMonths = calculateAgeInMonths(child.date_of_birth);

      // ── 1. Vaccine Check (Due in next 7 days) ──────────────────────────
      // Fetch scheduled vaccines that are not administered
      const nextWeekDate = new Date();
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      const nextWeekStr = nextWeekDate.toISOString().split("T")[0]; // YYYY-MM-DD
      const todayStr = new Date().toISOString().split("T")[0];

      const { data: vaccines } = await supabase
        .from("vaccination_records")
        .select(`
          id,
          scheduled_date,
          vaccine:vaccines!inner ( name )
        `)
        .eq("child_id", child.id)
        .eq("status", "scheduled")
        .lte("scheduled_date", nextWeekStr)
        .gte("scheduled_date", todayStr);

      if (vaccines && vaccines.length > 0) {
        for (const vRecord of vaccines) {
          const vName = Array.isArray(vRecord.vaccine)
            ? vRecord.vaccine[0].name
            : (vRecord.vaccine as any).name;

          const inserted = await safeInsertNotification({
            profile_id: child.parent_id,
            type: "vaccine_reminder",
            title: `Vaccine Reminder: ${vName}`,
            message: `${child.first_name} is scheduled for the ${vName} vaccine on ${vRecord.scheduled_date}.`,
            reference_id: vRecord.id,
          });
          if (inserted) newAlertsCount++;
        }
      }

      // ── 2. Milestone Check ─────────────────────────────────────────────
      // Fetch unachieved milestones for this child
      const { data: milestones } = await supabase
        .from("child_milestones")
        .select(`
          id,
          milestone:milestones!inner ( title, target_age_months )
        `)
        .eq("child_id", child.id)
        .eq("status", "not-started");

      if (milestones && milestones.length > 0) {
        for (const mRecord of milestones) {
          const targetAge = Array.isArray(mRecord.milestone)
            ? mRecord.milestone[0].target_age_months
            : (mRecord.milestone as any).target_age_months;

          const title = Array.isArray(mRecord.milestone)
            ? mRecord.milestone[0].title
            : (mRecord.milestone as any).title;

          // If the child is exactly at or just past the target age (by 1 month), send alert
          if (ageInMonths === targetAge || ageInMonths === targetAge + 1) {
            const inserted = await safeInsertNotification({
              profile_id: child.parent_id,
              type: "milestone_alert",
              title: `Milestone Alert: ${title}`,
              message: `${child.first_name} is at the expected age (${targetAge} months) to achieve the '${title}' milestone. Time to practice!`,
              reference_id: mRecord.id,
            });
            if (inserted) newAlertsCount++;
          }
        }
      }
    }

    return { generated: newAlertsCount };
  } catch (error) {
    console.error("generateSystemNotifications error", error);
    return { generated: newAlertsCount };
  }
}

/**
 * Attempts to insert a notification, gracefully ignoring unique constraint errors
 * which indicate the notification was already generated (thanks to the unique index
 * on reference_id + type).
 */
async function safeInsertNotification(payload: {
  profile_id: string;
  type: NotificationType;
  title: string;
  message: string;
  reference_id: string;
}): Promise<boolean> {
  const { error } = await supabase.from("notifications").insert([payload]);

  if (error) {
    // 23505 is PostgreSQL's unique_violation error code
    if (error.code === "23505") {
      return false; // Already exists
    }
    console.error("Error inserting notification:", error);
    return false;
  }
  return true;
}
