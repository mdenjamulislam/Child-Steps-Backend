import { Router } from "express";
import { signup, login, me } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user (creates Supabase Auth user + public.profiles record)
 * @access  Public
 * @body    { email, password, full_name, role_name }
 */
router.post("/signup", signup);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return access token + profile + role
 * @access  Public
 * @body    { email, password }
 */
router.post("/login", login);

/**
 * @route   GET /api/auth/me
 * @desc    Return the authenticated user's full profile and permissions
 * @access  Private (Bearer token required)
 */
router.get("/me", requireAuth, me);

export default router;
