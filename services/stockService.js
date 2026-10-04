const YahooFinance = require("yahoo-finance2").default;
const yahooFinance = new YahooFinance();
const ApiError = require("../utils/ApiError");
const priceCache = require("./priceCache");
const alpacaStream = require("./alpacaStream");
const fxService = require("./fxService");

// Yahoo index tickers do not use the .NS/.BO suffix, so list the principal
// Indian benchmarks alongside NSE/BSE equities.
const INDIAN_INDEX_SYMBOLS = new Set(["^NSEI", "^BSESN", "^NSEBANK"]);
const isIndianSymbol = (symbol) => /\.(NS|BO)$/i.test(symbol) || INDIAN_INDEX_SYMBOLS.has(String(symbol).toUpperCase());

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
  const indian = isIndianSymbol(symbol);

  // 1. Check the real-time cache first (sub-second data from WebSocket)
  const cachedPrice = priceCache.getFreshPrice(symbol);
  if (cachedPrice !== null) {
    return cachedPrice;
  }

  // 2. Alpaca only supports US listings. NSE/BSE quotes use Yahoo.
  if (!indian) {
    try {
      const snapshotPrice = await alpacaStream.getSnapshotPrice(symbol);
      if (snapshotPrice !== null) {
        alpacaStream.subscribe([symbol]);
        return snapshotPrice;
      }
    } catch (error) {
      console.warn(`Alpaca snapshot failed for ${symbol}, falling back to Yahoo:`, error.message);
    }
  }

  // 3. Fallback to Yahoo Finance (~15 min delayed)
  try {
    const quote = await yahooFinance.quote(symbol);
    if (quote && quote.regularMarketPrice) {
      // Cache it so subsequent requests are faster
      priceCache.setPrice(symbol, quote.regularMarketPrice, indian ? "yahoo-india" : "yahoo-fallback");
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
  const indian = isIndianSymbol(symbol);

  // Get the real-time price first
  const livePrice = await getLivePrice(symbol);
  const priceInfo = getPriceInfo(symbol);

  // Still use Yahoo for the full quote metadata (name, volume, etc.)
  try {
    const quote = await yahooFinance.quote(symbol);

    const priceUSD = indian ? livePrice * (await fxService.getInrToUsd()) : livePrice;
    return {
      symbol: quote?.symbol || symbol,
      name: quote?.shortName || quote?.longName || "N/A",
      // Use our real-time price instead of Yahoo's delayed price
      price: livePrice,
      priceUSD,
      priceINR: indian ? livePrice : undefined,
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
      currency: indian ? "INR" : "USD",
    };
  } catch (error) {
    // If Yahoo fails, return just the price we have
    const priceUSD = indian ? livePrice * (await fxService.getInrToUsd()) : livePrice;
    return {
      symbol,
      name: "N/A",
      price: livePrice,
      priceUSD,
      priceINR: indian ? livePrice : undefined,
      currency: indian ? "INR" : "USD",
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

    // Yahoo labels exchange-traded funds separately from equities.  They are
    // tradable instruments too, so keep them alongside shares and indices.
    const supportedTypes = new Set(["EQUITY", "ETF", "INDEX"]);
    const quotes = (results.quotes || [])
      .filter((item) => supportedTypes.has(item.quoteType));

    // Ensure the benchmark itself is discoverable even if Yahoo's search
    // ranking returns related NIFTY ETFs ahead of it.
    if (
      /nifty\s*50/i.test(query) &&
      !quotes.some((item) => item.symbol === "^NSEI")
    ) {
      quotes.unshift({
        symbol: "^NSEI",
        quoteType: "INDEX",
        shortname: "NIFTY 50",
        exchDisp: "NSE",
        typeDisp: "INDEX",
      });
    }

    return quotes
      .map((item) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || "N/A",
        exchange: item.exchDisp,
        type: item.typeDisp || item.quoteType,
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
    let isIntraday1D = false;
    
    switch (period) {
      case "1d":
        // Look back up to 7 days to guarantee capturing the last active trading session
        // even during 3-day weekends or exchange holidays
        period1.setDate(now.getDate() - 7);
        interval = "5m"; // Finer granularity for 1 day
        isIntraday1D = true;
        break;
      case "5d":
        // Look back 8 days so weekends don't reduce the trading day sample
        period1.setDate(now.getDate() - 8);
        interval = "15m"; // 15-minute granularity for 5 days
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

    let quotes = (result?.quotes || []).filter(
      (candle) => candle && candle.close != null
    );

    if (quotes.length === 0) {
      throw ApiError.notFound(`No historical data found for symbol: ${symbol}`);
    }

    // For 1-day intraday:
    // If the market was closed recently (e.g. weekend/holidays), isolate the most recent active trading day
    if (isIntraday1D) {
      const lastQuote = quotes[quotes.length - 1];
      const lastTradingDay = new Date(lastQuote.date).toISOString().slice(0, 10);
      const dayQuotes = quotes.filter(
        (q) => new Date(q.date).toISOString().slice(0, 10) === lastTradingDay
      );
      if (dayQuotes.length > 0) {
        quotes = dayQuotes;
      }
    }

    return quotes.map((candle) => ({
      date: candle.date,
      open: candle.open ?? candle.close,
      high: candle.high ?? candle.close,
      low: candle.low ?? candle.close,
      close: candle.close,
      volume: candle.volume ?? 0,
    }));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest(`Failed to fetch history for "${symbol}".`);
  }
};

module.exports = { getLivePrice, getPriceInfo, getQuote, search, getHistory, isIndianSymbol };
