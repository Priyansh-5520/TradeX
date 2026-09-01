const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Public routes
router.post("/google", authController.googleLogin);
router.post("/complete-signup", authController.completeSignup);
router.get("/check-username/:userName", authController.checkUsername);

// Protected route
router.get("/me", protect, authController.getMe);

module.exports = router;
