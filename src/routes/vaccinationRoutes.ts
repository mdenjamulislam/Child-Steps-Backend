import { Router } from "express";
import {
  initializeSchedule,
  getVaccinationSchedule,
  markAdministered,
} from "../controllers/vaccinationController";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// Protect all vaccination routes
router.use(requireAuth);

// POST /api/vaccinations/initialize/:childId
// Initializes the vaccination schedule for a child (idempotent)
router.post("/initialize/:childId", initializeSchedule);

// GET /api/vaccinations/:childId
// Returns the full chronological vaccination timeline for a child
router.get("/:childId", getVaccinationSchedule);

// PUT /api/vaccinations/record/:recordId
// Marks a vaccination as administered or updates notes
router.put("/record/:recordId", markAdministered);

export default router;
