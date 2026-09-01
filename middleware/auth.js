const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware to protect routes.
 * Verifies JWT from Authorization header and attaches user to req.user.
 *
 * Usage: router.get("/profile", protect, controller.getProfile)
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authorized, no token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-__v");

    if (!user) {
      return res.status(401).json({ error: "Not authorized, user not found" });
    }

    req.user = {
      id: user._id,
      googleId: user.googleId,
      email: user.email,
      userName: user.userName,
      virtualCash: user.virtualCash,
      watchlist: user.watchlist,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired, please login again" });
    }

    return res.status(401).json({ error: "Not authorized, invalid token" });
  }
};

module.exports = { protect };
