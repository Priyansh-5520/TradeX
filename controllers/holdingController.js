const holdingService = require("../services/holdingService");

/**
 * GET /api/holdings
 */
const getPortfolio = async (req, res, next) => {
  try {
    const portfolio = await holdingService.getPortfolio(req.user.id);

    return res.status(200).json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPortfolio
};
