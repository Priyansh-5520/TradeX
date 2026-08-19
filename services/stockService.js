const yahooFinance = require("yahoo-finance2").default;
const ApiError = require("../utils/ApiError");

/**
 * Stock Service — Fetches live market data from Yahoo Finance.
 * This is the single source of truth for all stock prices in TradeX.
 */

/**
 * Get the current live price for a stock symbol.
 * @param {string} symbol - Stock ticker (e.g., "AAPL", "TSLA")
 * @returns {number} Current market price
 */
const getLivePrice = async (symbol) => {
  try {
    const quote = await yahooFinance.quote(symbol);

    if (!quote || !quote.regularMarketPrice) {
      throw ApiError.notFound(`No price data found for symbol: ${symbol}`);
    }

    return quote.regularMarketPrice;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest(`Failed to fetch price for "${symbol}". Is the symbol valid?`);
  }
};

/**
 * Get a full quote with detailed market data.
 * @param {string} symbol - Stock ticker
 * @returns {Object} Formatted quote data
 */
const getQuote = async (symbol) => {
  try {
    const quote = await yahooFinance.quote(symbol);

    if (!quote || !quote.regularMarketPrice) {
      throw ApiError.notFound(`No quote data found for symbol: ${symbol}`);
    }

    return {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName || "N/A",
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      previousClose: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      marketCap: quote.marketCap,
      pe: quote.trailingPE,
      exchange: quote.fullExchangeName,
      currency: quote.currency,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest(`Failed to fetch quote for "${symbol}". Is the symbol valid?`);
  }
};

/**
 * Search for stocks by company name or symbol.
 * @param {string} query - Search term (e.g., "Apple", "Tesla")
 * @returns {Array} Matching stocks
 */
const search = async (query) => {
  try {
    const results = await yahooFinance.search(query);

    return (results.quotes || [])
      .filter((item) => item.quoteType === "EQUITY")
      .map((item) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || "N/A",
        exchange: item.exchDisp,
        type: item.typeDisp,
      }));
  } catch (error) {
    throw ApiError.badRequest(`Search failed for "${query}".`);
  }
};

/**
 * Get historical price data for a stock.
 * @param {string} symbol - Stock ticker
 * @param {string} period - Time period ("1d", "5d", "1mo", "3mo", "6mo", "1y", "5y", "max")
 * @returns {Array} Historical candle data
 */
const getHistory = async (symbol, period = "1mo") => {
  try {
    const result = await yahooFinance.chart(symbol, { period1: period });

    if (!result || !result.quotes || result.quotes.length === 0) {
      throw ApiError.notFound(`No historical data found for symbol: ${symbol}`);
    }

    return result.quotes.map((candle) => ({
      date: candle.date,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest(`Failed to fetch history for "${symbol}".`);
  }
};

module.exports = { getLivePrice, getQuote, search, getHistory };
