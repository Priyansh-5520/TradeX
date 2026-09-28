const YahooFinance = require("yahoo-finance2").default;
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const priceCache = require("./priceCache");

const symbols = new Set();
let timer = null;
const isIndianMarketSymbol = (symbol) => /\.(NS|BO)$/i.test(symbol) || ["^NSEI", "^BSESN", "^NSEBANK"].includes(String(symbol).toUpperCase());

const poll = async () => {
  await Promise.all([...symbols].map(async (symbol) => {
    try {
      const quote = await yahooFinance.quote(symbol);
      const price = Number(quote?.regularMarketPrice);
      if (Number.isFinite(price) && price > 0) priceCache.setPrice(symbol, price, "yahoo-india-poll");
    } catch (error) {
      console.warn(`Indian quote poll failed for ${symbol}: ${error.message}`);
    }
  }));
};

const subscribe = (items) => {
  items.filter(isIndianMarketSymbol).forEach((symbol) => symbols.add(symbol.toUpperCase()));
  if (!timer && symbols.size) {
    timer = setInterval(poll, 5_000);
    poll();
  }
};

module.exports = { subscribe, poll };
