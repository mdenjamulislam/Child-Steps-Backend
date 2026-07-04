import { Router } from "express";
import {
  getAllChildren,
  getChildById,
  createChild,
  updateChild,
  deleteChild,
} from "../controllers/children.controller";

const router = Router();

router.get("/", getAllChildren);
router.get("/:id", getChildById);
router.post("/", createChild);
router.put("/:id", updateChild);
router.delete("/:id", deleteChild);

export default router;
