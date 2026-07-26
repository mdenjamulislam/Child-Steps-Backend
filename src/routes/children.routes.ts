import { Router } from "express";
import {
  getAllChildren,
  getChildById,
  createChild,
  updateChild,
  deleteChild,
} from "../controllers/children.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", getAllChildren);
router.get("/:id", getChildById);
router.post("/", createChild);
router.put("/:id", updateChild);
router.delete("/:id", deleteChild);

export default router;
