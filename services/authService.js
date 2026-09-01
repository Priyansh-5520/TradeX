const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify a Google ID token and extract user info.
 * Only allows @gmail.com accounts.
 */
const verifyGoogleToken = async (idToken) => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload.email_verified) {
    throw new Error("Google account email is not verified");
  }

  if (!payload.email.endsWith("@gmail.com")) {
    throw new Error("Only Gmail accounts are allowed");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
  };
};

/**
 * Generate a JWT for the given user.
 */
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, googleId: user.googleId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

/**
 * Handle Google login.
 * - If user exists → return JWT + user data
 * - If user doesn't exist → return flag indicating username is needed
 */
const googleLogin = async (idToken) => {
  const googleUser = await verifyGoogleToken(idToken);

  const existingUser = await User.findOne({ googleId: googleUser.googleId });

  if (existingUser) {
    const token = generateToken(existingUser);
    return {
      isNewUser: false,
      token,
      user: {
        id: existingUser._id,
        userName: existingUser.userName,
        email: existingUser.email,
        virtualCash: existingUser.virtualCash,
        watchlist: existingUser.watchlist,
      },
    };
  }

  // New user — don't create account yet, need username first
  return {
    isNewUser: true,
    googleUser, // send back to frontend so it can be passed to complete-signup
  };
};

/**
 * Complete signup for a new Google user by setting a username.
 */
const completeSignup = async (idToken, userName) => {
  // Re-verify the Google token to ensure authenticity
  const googleUser = await verifyGoogleToken(idToken);

  // Check if this Google account already has an account
  const existingByGoogle = await User.findOne({ googleId: googleUser.googleId });
  if (existingByGoogle) {
    throw new Error("Account already exists for this Google account");
  }

  // Check if username is taken
  const existingByUsername = await User.findOne({ userName });
  if (existingByUsername) {
    throw new Error("Username is already taken");
  }

  // Create the user
  const newUser = await User.create({
    googleId: googleUser.googleId,
    email: googleUser.email,
    userName,
  });

  const token = generateToken(newUser);

  return {
    token,
    user: {
      id: newUser._id,
      userName: newUser.userName,
      email: newUser.email,
      virtualCash: newUser.virtualCash,
      watchlist: newUser.watchlist,
    },
  };
};

/**
 * Check if a username is available.
 */
const checkUsername = async (userName) => {
  const existing = await User.findOne({ userName });
  return !existing;
};

module.exports = {
  googleLogin,
  completeSignup,
  checkUsername,
};
