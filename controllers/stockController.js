const stockService = require("../services/stockService");

/**
 * GET /api/stocks/quote/:symbol — Get full quote for a stock
 */
const getQuote = async (req, res, next) => {
  try {
    const quote = await stockService.getQuote(req.params.symbol);

    return res.status(200).json({
      success: true,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stocks/search?q=apple — Search stocks by name
 */
const searchStocks = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Search query 'q' is required (e.g., /api/stocks/search?q=apple)",
      });
    }

    const results = await stockService.search(q);

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stocks/history/:symbol?period=1mo — Get historical data
 */
const getHistory = async (req, res, next) => {
  try {
    const period = req.query.period || "1mo";
    const history = await stockService.getHistory(req.params.symbol, period);

    return res.status(200).json({
      success: true,
      symbol: req.params.symbol.toUpperCase(),
      period,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getQuote, searchStocks, getHistory };
