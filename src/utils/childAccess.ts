import { supabase } from "../config/supabase";

/**
 * Validates that the specified user (parentId) is the parent of the child (childId).
 * @param childId UUID of the child
 * @param parentId UUID of the parent (from req.authUser.id)
 * @returns boolean indicating if access is granted
 */
export async function verifyChildAccess(
  childId: string,
  parentId: string
): Promise<boolean> {
  if (!childId || !parentId) return false;

  const { data, error } = await supabase
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("parent_id", parentId)
    .single();

  if (error || !data) {
    return false;
  }
  return true;
}
