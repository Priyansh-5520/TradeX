const authService = require("../services/authService");

/**
 * POST /api/auth/google
 * Body: { idToken: string }
 *
 * If user exists → 200 { token, user }
 * If new user   → 200 { isNewUser: true, googleUser }
 */
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "Google ID token is required" });
    }

    const result = await authService.googleLogin(idToken);

    if (result.isNewUser) {
      return res.status(200).json({
        isNewUser: true,
        email: result.googleUser.email,
      });
    }

    return res.status(200).json({
      isNewUser: false,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("Google login error:", error.message);

    if (error.message.includes("Gmail accounts")) {
      return res.status(403).json({ error: error.message });
    }

    return res.status(401).json({ error: "Authentication failed" });
  }
};

/**
 * POST /api/auth/complete-signup
 * Body: { idToken: string, userName: string }
 *
 * Creates account with chosen username → 201 { token, user }
 */
const completeSignup = async (req, res) => {
  try {
    const { idToken, userName } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "Google ID token is required" });
    }

    if (!userName || userName.trim().length === 0) {
      return res.status(400).json({ error: "Username is required" });
    }

    const result = await authService.completeSignup(idToken, userName.trim());

    return res.status(201).json({
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("Signup error:", error.message);

    if (error.message.includes("already taken")) {
      return res.status(409).json({ error: error.message });
    }

    if (error.message.includes("already exists")) {
      return res.status(409).json({ error: error.message });
    }

    if (error.message.includes("Gmail accounts")) {
      return res.status(403).json({ error: error.message });
    }

    // Mongoose validation errors (minlength, match, etc.)
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }

    return res.status(401).json({ error: "Signup failed" });
  }
};

/**
 * GET /api/auth/check-username/:userName
 *
 * Returns 200 { available: boolean }
 */
const checkUsername = async (req, res) => {
  try {
    const { userName } = req.params;
    const available = await authService.checkUsername(userName);
    return res.status(200).json({ available });
  } catch (error) {
    console.error("Username check error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * GET /api/auth/me
 * Protected route — returns the current user's data from JWT.
 */
const getMe = async (req, res) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (error) {
    console.error("Get me error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  googleLogin,
  completeSignup,
  checkUsername,
  getMe,
};
