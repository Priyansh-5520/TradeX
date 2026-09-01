const User = require("../models/User");
const ApiError = require("../utils/ApiError");

/**
 * Get user profile including the watchlist (which contains held symbols)
 */
const getProfile = async (userId) => {
  const user = await User.findById(userId).select("-__v");
  
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return user;
};

module.exports = {
  getProfile
};
