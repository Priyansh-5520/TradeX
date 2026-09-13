const tradeService = require("../services/tradeService");
const stockService = require("../services/stockService");
const quoteLock = require("../services/quoteLock");
const ApiError = require("../utils/ApiError");

/**
 * POST /api/trade/lock-quote
 * Body: { symbol: string }
 *
 * Locks the current price of a stock for 10 seconds.
 * The user can then confirm the trade using the returned quoteId.
 */
const lockQuote = async (req, res, next) => {
  try {
    const { symbol } = req.body;

    if (!symbol) {
      throw ApiError.badRequest("Symbol is required");
    }

    // Get the current live price
    const price = await stockService.getLivePrice(symbol);
    const priceInfo = stockService.getPriceInfo(symbol);

    // Create a lock for this user
    const lock = quoteLock.createLock(symbol, price, req.user.id);

    return res.status(200).json({
      success: true,
      data: {
        ...lock,
        priceSource: priceInfo?.source || "unknown",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/trade/buy
 * Body: { symbol: string, quantity: number, quoteId?: string, expectedPrice?: number }
 */
const buyStock = async (req, res, next) => {
  try {
    const { symbol, quantity, quoteId, expectedPrice } = req.body;
    
    if (!symbol || !quantity) {
      throw ApiError.badRequest("Symbol and quantity are required");
    }

    // Convert quantity to number
    const qty = Number(quantity);
    if (isNaN(qty)) throw ApiError.badRequest("Quantity must be a valid number");

    const result = await tradeService.buyStock(req.user.id, symbol, qty, {
      quoteId,
      expectedPrice,
    });

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
 * Body: { symbol: string, quantity: number, quoteId?: string, expectedPrice?: number }
 */
const sellStock = async (req, res, next) => {
  try {
    const { symbol, quantity, quoteId, expectedPrice } = req.body;
    
    if (!symbol || !quantity) {
      throw ApiError.badRequest("Symbol and quantity are required");
    }

    const qty = Number(quantity);
    if (isNaN(qty)) throw ApiError.badRequest("Quantity must be a valid number");

    const result = await tradeService.sellStock(req.user.id, symbol, qty, {
      quoteId,
      expectedPrice,
    });

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
  lockQuote,
  buyStock,
  sellStock,
  getTransactions
};
