const tradeService = require("../services/tradeService");
const stockService = require("../services/stockService");
const quoteLock = require("../services/quoteLock");
const alpacaStream = require("../services/alpacaStream");
const { getIndianMarketStatus } = require("../services/indianMarketService");
const ApiError = require("../utils/ApiError");

const requireOpenMarket = async () => {
  if (process.env.BYPASS_MARKET_HOURS === "true") return;
  const market = await alpacaStream.getMarketStatus();
  if (!market) {
    throw ApiError.badRequest("Market status is unavailable. Please try again shortly.");
  }
  if (!market.isOpen) {
    throw ApiError.badRequest("The US stock market is closed. Trading is available during regular market hours only.");
  }
};

const requireOpenMarketForSymbol = async (symbol) => {
  if (["^NSEI", "^BSESN", "^NSEBANK"].includes(String(symbol).toUpperCase())) {
    throw ApiError.badRequest("Market indices such as NIFTY 50 are view-only and cannot be traded.");
  }
  if (process.env.BYPASS_MARKET_HOURS === "true") return;
  if (/\.(NS|BO)$/i.test(symbol)) {
    if (!getIndianMarketStatus().isOpen) {
      throw ApiError.badRequest("The Indian stock market is closed. NSE/BSE trading is available Monday–Friday, 09:15–15:30 IST.");
    }
    return;
  }
  await requireOpenMarket();
};

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
    await requireOpenMarketForSymbol(symbol);

    // Lock the USD execution price; quote.price may be INR for NSE/BSE.
    const quote = await stockService.getQuote(symbol);
    const price = quote.priceUSD;
    const priceInfo = stockService.getPriceInfo(symbol);

    // Create a lock for this user
    const lock = quoteLock.createLock(symbol, price, req.user.id);

    return res.status(200).json({
      success: true,
      data: {
        ...lock,
        currency: quote.currency,
        priceINR: quote.priceINR,
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
    await requireOpenMarketForSymbol(symbol);

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
    await requireOpenMarketForSymbol(symbol);

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
