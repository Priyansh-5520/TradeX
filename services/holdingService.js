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
      let livePrice = 0;
      try {
        livePrice = await stockService.getLivePrice(holding.symbol);
      } catch (error) {
        // Fallback or handle error if price fetch fails temporarily
        console.warn(`Could not fetch live price for ${holding.symbol}`);
      }

      const currentValue = livePrice * holding.quantity;
      const profit = currentValue - holding.investment;
      const profitPercentage = holding.investment > 0 ? (profit / holding.investment) * 100 : 0;

      return {
        id: holding._id,
        symbol: holding.symbol,
        quantity: holding.quantity,
        averageCost: holding.investment / holding.quantity,
        totalInvestment: holding.investment,
        currentPrice: livePrice,
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
