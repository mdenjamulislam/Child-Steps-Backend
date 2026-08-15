import { Router } from "express";
import {
  initializeSchedule,
  getVaccinationSchedule,
  markAdministered,
  resetVaccinationRecord,
} from "../controllers/vaccinationController";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// ── Auth guard — all vaccination routes require a valid JWT ───────────────────
router.use(requireAuth);

// ── POST /api/vaccinations/initialize/:childId ────────────────────────────────
// Initializes the child's vaccination schedule from the master vaccines catalog.
// Idempotent — safe to call multiple times (existing records are not overwritten).
router.post("/initialize/:childId", initializeSchedule);

// ── GET /api/vaccinations/:childId ────────────────────────────────────────────
// Returns the complete chronological vaccination timeline joined with vaccine info.
// NOTE: This route must come AFTER /initialize/:childId and /record/:recordId
//       to avoid Express matching ":childId" against literal path segments.
router.get("/:childId", getVaccinationSchedule);

// ── PUT /api/vaccinations/record/:recordId ────────────────────────────────────
// Marks a vaccination record as 'administered' or 'skipped'.
// Body: { administered_date?, administered_by, notes?, status? }
router.put("/record/:recordId", markAdministered);

// ── DELETE /api/vaccinations/record/:recordId ─────────────────────────────────
// Resets a vaccination record back to 'scheduled', clearing all log fields.
// Useful when a record was logged by mistake.
router.delete("/record/:recordId", resetVaccinationRecord);

export default router;
