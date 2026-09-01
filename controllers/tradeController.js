const tradeService = require("../services/tradeService");
const ApiError = require("../utils/ApiError");

/**
 * POST /api/trade/buy
 * Body: { symbol: string, quantity: number }
 */
const buyStock = async (req, res, next) => {
  try {
    const { symbol, quantity } = req.body;
    
    if (!symbol || !quantity) {
      throw ApiError.badRequest("Symbol and quantity are required");
    }

    // Convert quantity to number
    const qty = Number(quantity);
    if (isNaN(qty)) throw ApiError.badRequest("Quantity must be a valid number");

    const result = await tradeService.buyStock(req.user.id, symbol, qty);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/trade/sell
 * Body: { symbol: string, quantity: number }
 */
const sellStock = async (req, res, next) => {
  try {
    const { symbol, quantity } = req.body;
    
    if (!symbol || !quantity) {
      throw ApiError.badRequest("Symbol and quantity are required");
    }

    const qty = Number(quantity);
    if (isNaN(qty)) throw ApiError.badRequest("Quantity must be a valid number");

    const result = await tradeService.sellStock(req.user.id, symbol, qty);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/transactions
 * Query: ?symbol=AAPL&type=BUY&limit=20
 */
const getTransactions = async (req, res, next) => {
  try {
    const filters = {
      symbol: req.query.symbol,
      type: req.query.type,
      limit: req.query.limit
    };

    const transactions = await tradeService.getTransactions(req.user.id, filters);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  buyStock,
  sellStock,
  getTransactions
};
