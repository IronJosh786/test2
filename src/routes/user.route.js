import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    registerUser,
    loginUser,
    regenerateToken,
    logoutUser,
    getUser,
    changePassword,
    updateUserDetails,
    updateUserProfilePicture,
    getTransactionHistory,
    getAllUsers,
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(upload.single("profilePicture"), registerUser);
router.route("/login").post(loginUser);
router.route("/regenerate-token").post(regenerateToken);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getUser);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/update-profile").patch(verifyJWT, updateUserDetails);
router
    .route("/update-profilePicture")
    .patch(
        verifyJWT,
        upload.single("profilePicture"),
        updateUserProfilePicture
    );
router.route("/get-transaction-history").get(verifyJWT, getTransactionHistory);
router.route("/get-all-users").get(verifyJWT, getAllUsers);

export default router;
