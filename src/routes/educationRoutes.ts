import { Router } from "express";
import {
  addAcademicRecord,
  getAcademicHistory,
  updateAcademicRecord,
  deleteAcademicRecord,
} from "../controllers/educationController";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// ── Auth guard — all education routes require a valid JWT ─────────────────────
router.use(requireAuth);

// ── POST /api/education ───────────────────────────────────────────────────────
// Creates a new academic/educational record for a child.
// Body: { child_id, academic_year, grade_level, subject, score_or_grade, teacher_feedback? }
// Access: parent of the child OR teacher/staff role.
router.post("/", addAcademicRecord);

// ── GET /api/education/:childId ───────────────────────────────────────────────
// Returns all educational records for a specific child, sorted by
// academic_year DESC, then created_at DESC.
// Access: parent of the child OR teacher/staff role.
router.get("/:childId", getAcademicHistory);

// ── PUT /api/education/:recordId ──────────────────────────────────────────────
// Partially updates an existing educational record.
// Body (all optional): { academic_year?, grade_level?, subject?, score_or_grade?, teacher_feedback? }
// Access: original logger (teacher/staff who created it) OR parent of the child OR admin.
router.put("/:recordId", updateAcademicRecord);

// ── DELETE /api/education/:recordId ───────────────────────────────────────────
// Permanently deletes an educational record.
// Access: original logger OR parent of the child OR admin.
router.delete("/:recordId", deleteAcademicRecord);

export default router;
