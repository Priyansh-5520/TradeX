const YahooFinance = require("yahoo-finance2").default;
const yahooFinance = new YahooFinance();
const ApiError = require("../utils/ApiError");
const priceCache = require("./priceCache");
const alpacaStream = require("./alpacaStream");

/**
 * Stock Service — Fetches live market data.
 *
 * Price resolution order:
 *   1. priceCache (real-time WebSocket data, < 30s old)
 *   2. Alpaca REST snapshot (on-demand, real-time)
 *   3. Yahoo Finance (fallback, ~15 min delayed)
 *
 * Search and history still use Yahoo Finance (better coverage).
 */

/**
 * Get the current live price for a stock symbol.
 * Uses the fastest available source.
 * @param {string} symbol - Stock ticker (e.g., "AAPL", "TSLA")
 * @returns {Promise<number>} Current market price
 */
const getLivePrice = async (symbol) => {
  symbol = symbol.toUpperCase();

  // 1. Check the real-time cache first (sub-second data from WebSocket)
  const cachedPrice = priceCache.getFreshPrice(symbol);
  if (cachedPrice !== null) {
    return cachedPrice;
  }

  // 2. Try Alpaca REST snapshot (real-time, on-demand)
  try {
    const snapshotPrice = await alpacaStream.getSnapshotPrice(symbol);
    if (snapshotPrice !== null) {
      // Also subscribe to this symbol for future real-time updates
      alpacaStream.subscribe([symbol]);
      return snapshotPrice;
    }
  } catch (error) {
    console.warn(`Alpaca snapshot failed for ${symbol}, falling back to Yahoo:`, error.message);
  }

  // 3. Fallback to Yahoo Finance (~15 min delayed)
  try {
    const quote = await yahooFinance.quote(symbol);
    if (quote && quote.regularMarketPrice) {
      // Cache it so subsequent requests are faster
      priceCache.setPrice(symbol, quote.regularMarketPrice, "yahoo-fallback");
      return quote.regularMarketPrice;
    }
    throw ApiError.notFound(`No price data found for symbol: ${symbol}`);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest(`Failed to fetch price for "${symbol}". Is the symbol valid?`);
  }
};

/**
 * Get the price source info for a symbol (for transparency).
 * @param {string} symbol
 * @returns {Object} { price, source, ageMs }
 */
const getPriceInfo = (symbol) => {
  const cached = priceCache.getPrice(symbol.toUpperCase());
  if (cached) {
    return {
      price: cached.price,
      source: cached.source,
      ageMs: cached.ageMs,
      fresh: cached.ageMs < priceCache.MAX_AGE_MS,
    };
  }
  return null;
};

/**
 * Get a full quote with detailed market data.
 * @param {string} symbol - Stock ticker
 * @returns {Object} Formatted quote data
 */
const getQuote = async (symbol) => {
  symbol = symbol.toUpperCase();

  // Get the real-time price first
  const livePrice = await getLivePrice(symbol);
  const priceInfo = getPriceInfo(symbol);

  // Still use Yahoo for the full quote metadata (name, volume, etc.)
  try {
    const quote = await yahooFinance.quote(symbol);

    return {
      symbol: quote?.symbol || symbol,
      name: quote?.shortName || quote?.longName || "N/A",
      // Use our real-time price instead of Yahoo's delayed price
      price: livePrice,
      priceSource: priceInfo?.source || "yahoo",
      priceAgeMs: priceInfo?.ageMs || null,
      change: quote?.regularMarketChange,
      changePercent: quote?.regularMarketChangePercent,
      dayHigh: quote?.regularMarketDayHigh,
      dayLow: quote?.regularMarketDayLow,
      volume: quote?.regularMarketVolume,
      previousClose: quote?.regularMarketPreviousClose,
      open: quote?.regularMarketOpen,
      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow,
      marketCap: quote?.marketCap,
      pe: quote?.trailingPE,
      exchange: quote?.fullExchangeName,
      currency: quote?.currency,
    };
  } catch (error) {
    // If Yahoo fails, return just the price we have
    return {
      symbol,
      name: "N/A",
      price: livePrice,
      priceSource: priceInfo?.source || "unknown",
      priceAgeMs: priceInfo?.ageMs || null,
    };
  }
};

/**
 * Search for stocks by company name or symbol.
 * Uses Yahoo Finance (better search coverage than Alpaca).
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
 * Uses Yahoo Finance (Alpaca historical requires paid plan for extended history).
 * @param {string} symbol - Stock ticker
 * @param {string} period - Time period ("1d", "5d", "1mo", "3mo", "6mo", "1y", "5y", "max")
 * @returns {Array} Historical candle data
 */
const getHistory = async (symbol, period = "1mo") => {
  try {
    const now = new Date();
    const period1 = new Date();
    let interval = "1d";
    
    switch (period) {
      case "1d":
        period1.setDate(now.getDate() - 1);
        interval = "5m"; // Need finer granularity for 1 day
        break;
      case "5d":
        period1.setDate(now.getDate() - 5);
        interval = "15m"; // Need finer granularity for 5 days
        break;
      case "1mo":
        period1.setMonth(now.getMonth() - 1);
        break;
      case "3mo":
        period1.setMonth(now.getMonth() - 3);
        break;
      case "6mo":
        period1.setMonth(now.getMonth() - 6);
        break;
      case "1y":
        period1.setFullYear(now.getFullYear() - 1);
        break;
      case "5y":
        period1.setFullYear(now.getFullYear() - 5);
        interval = "1wk";
        break;
      case "max":
        period1.setFullYear(1970);
        interval = "1mo";
        break;
      default:
        period1.setMonth(now.getMonth() - 1);
    }

    const result = await yahooFinance.chart(symbol, { period1, interval });

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

module.exports = { getLivePrice, getPriceInfo, getQuote, search, getHistory };
