const userService = require("../services/userService");

/**
 * GET /api/user/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user.id);

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile
};
