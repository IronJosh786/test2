import { Router } from "express";

const router = Router();

import { check } from "../controllers/health.controller.js";

router.route("/check").get(check);

export default router;
