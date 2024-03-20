import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

import { newTransaction } from "../controllers/transaction.controller.js";

router.route("/new-transaction").post(verifyJWT, newTransaction);

export default router;
