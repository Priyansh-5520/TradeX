const YahooFinance = require("yahoo-finance2").default;
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const FALLBACK_USD_TO_INR = 84;
const CACHE_MS = 60_000;
let cachedRate = FALLBACK_USD_TO_INR;
let fetchedAt = 0;

const getUsdToInr = async () => {
  if (Date.now() - fetchedAt < CACHE_MS) return cachedRate;
  try {
    const quote = await yahooFinance.quote("USDINR=X");
    const rate = Number(quote?.regularMarketPrice);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid USD/INR rate");
    cachedRate = rate;
    fetchedAt = Date.now();
  } catch (error) {
    console.warn(`FX rate unavailable; using ${cachedRate} INR/USD.`);
  }
  return cachedRate;
};

const getInrToUsd = async () => 1 / (await getUsdToInr());

module.exports = { getUsdToInr, getInrToUsd, FALLBACK_USD_TO_INR };
