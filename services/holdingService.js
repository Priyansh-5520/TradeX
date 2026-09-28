const Holding = require("../models/Holding");
const stockService = require("./stockService");

/**
 * Get user's portfolio (holdings + live P&L)
 */
const getPortfolio = async (userId) => {
  const holdings = await Holding.find({ userId });
  
  if (holdings.length === 0) {
    return {
      holdings: [],
      summary: {
        totalInvested: 0,
        totalCurrentValue: 0,
        totalProfit: 0,
        profitPercentage: 0
      }
    };
  }

  // Fetch live prices concurrently for all held symbols
  const enrichedHoldings = await Promise.all(
    holdings.map(async (holding) => {
      let quote = null;
      try {
        quote = await stockService.getQuote(holding.symbol);
      } catch (error) {
        // Fallback or handle error if price fetch fails temporarily
        console.warn(`Could not fetch live price for ${holding.symbol}`);
      }

      const currentPriceUSD = quote?.priceUSD || 0;
      const currentPrice = quote?.price || 0;
      const currentValue = currentPriceUSD * holding.quantity;
      const profit = currentValue - holding.investment;
      const profitPercentage = holding.investment > 0 ? (profit / holding.investment) * 100 : 0;

      return {
        id: holding._id,
        symbol: holding.symbol,
        quantity: holding.quantity,
        averageCost: holding.investment / holding.quantity,
        averageCostUSD: holding.investment / holding.quantity,
        totalInvestment: holding.investment,
        currency: holding.currency || (stockService.isIndianSymbol(holding.symbol) ? "INR" : "USD"),
        currentPrice,
        currentPriceUSD,
        currentPriceINR: quote?.priceINR,
        currentValue,
        profit,
        profitPercentage,
        createdAt: holding.createdAt,
        updatedAt: holding.updatedAt
      };
    })
  );

  // Calculate portfolio totals
  const summary = enrichedHoldings.reduce((acc, curr) => {
    acc.totalInvested += curr.totalInvestment;
    acc.totalCurrentValue += curr.currentValue;
    return acc;
  }, { totalInvested: 0, totalCurrentValue: 0 });

  summary.totalProfit = summary.totalCurrentValue - summary.totalInvested;
  summary.profitPercentage = summary.totalInvested > 0 ? (summary.totalProfit / summary.totalInvested) * 100 : 0;

  return {
    holdings: enrichedHoldings,
    summary
  };
};

module.exports = {
  getPortfolio
};
