const mongoose = require("mongoose");
const User = require("../models/User");
const Holding = require("../models/Holding");
const Transaction = require("../models/Transaction");
const stockService = require("./stockService");
const quoteLock = require("./quoteLock");
const ApiError = require("../utils/ApiError");

/** Default slippage tolerance (0.5%). */
const SLIPPAGE_TOLERANCE =
  parseFloat(process.env.SLIPPAGE_TOLERANCE) || 0.005;

/**
 * Check if a price is within slippage tolerance of an expected price.
 * @param {number} currentPrice - The live market price right now
 * @param {number} expectedPrice - The price the user expects
 * @returns {{ within: boolean, slippage: number, slippagePercent: number }}
 */
const checkSlippage = (currentPrice, expectedPrice) => {
  const slippage = Math.abs(currentPrice - expectedPrice);
  const slippagePercent = slippage / expectedPrice;

  return {
    within: slippagePercent <= SLIPPAGE_TOLERANCE,
    slippage,
    slippagePercent,
    tolerancePercent: SLIPPAGE_TOLERANCE,
  };
};

/**
 * Resolve the execution price for a trade.
 *
 * Priority:
 *   1. quoteId → use locked price (if valid, not expired, within slippage)
 *   2. expectedPrice → check live price is within slippage tolerance
 *   3. Neither → execute at current market price (backward compatible)
 *
 * @param {string} userId
 * @param {string} symbol
 * @param {Object} options - { quoteId, expectedPrice }
 * @returns {Promise<{ price: number, method: string }>}
 */
const resolveExecutionPrice = async (userId, symbol, options = {}) => {
  const { quoteId, expectedPrice } = options;

  // 1. Quote Lock — highest priority
  if (quoteId) {
    const result = quoteLock.validateLock(quoteId, userId, symbol);

    if (!result.valid) {
      throw ApiError.badRequest(result.error);
    }

    // The lock is valid — but verify the locked price hasn't drifted too far
    // from the current market price (protects against extreme events)
    const currentPrice = await stockService.getLivePrice(symbol);
    const slip = checkSlippage(currentPrice, result.lock.price);

    if (!slip.within) {
      throw ApiError.badRequest(
        `Price has moved beyond tolerance since your quote was locked. ` +
          `Locked: $${result.lock.price.toFixed(2)}, Current: $${currentPrice.toFixed(2)}, ` +
          `Slippage: ${(slip.slippagePercent * 100).toFixed(2)}% (max: ${(SLIPPAGE_TOLERANCE * 100).toFixed(1)}%). ` +
          `Please request a new quote.`
      );
    }

    // Execute at the locked price
    return { price: result.lock.price, method: "quote-lock" };
  }

  // 2. Expected Price — check slippage
  if (expectedPrice) {
    const ep = Number(expectedPrice);
    if (isNaN(ep) || ep <= 0) {
      throw ApiError.badRequest("expectedPrice must be a positive number");
    }

    const currentPrice = await stockService.getLivePrice(symbol);
    const slip = checkSlippage(currentPrice, ep);

    if (!slip.within) {
      throw ApiError.badRequest(
        `Price has moved beyond slippage tolerance. ` +
          `Expected: $${ep.toFixed(2)}, Current: $${currentPrice.toFixed(2)}, ` +
          `Slippage: ${(slip.slippagePercent * 100).toFixed(2)}% (max: ${(SLIPPAGE_TOLERANCE * 100).toFixed(1)}%). ` +
          `Please retry with the updated price.`
      );
    }

    // Execute at current market price (verified to be close to expected)
    return { price: currentPrice, method: "slippage-verified" };
  }

  // 3. Market order — no protection (backward compatible)
  const currentPrice = await stockService.getLivePrice(symbol);
  return { price: currentPrice, method: "market" };
};


const buyStock = async (userId, symbol, quantity, options = {}) => {
  if (quantity <= 0) throw ApiError.badRequest("Quantity must be greater than zero");

  symbol = symbol.toUpperCase();

  // Resolve the execution price (with quote lock / slippage protection)
  const { price, method } = await resolveExecutionPrice(userId, symbol, options);
  const totalCost = price * quantity;

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");

  if (user.virtualCash < totalCost) {
    throw ApiError.badRequest(`Insufficient funds. You need $${totalCost.toFixed(2)} but have $${user.virtualCash.toFixed(2)}`);
  }

  user.virtualCash -= totalCost;
  
  if (!user.watchlist.includes(symbol)) {
    user.watchlist.push(symbol);
  }
  await user.save();

  let holding = await Holding.findOne({ userId, symbol });
  if (holding) {
    holding.quantity += quantity;
    holding.investment += totalCost;
    await holding.save();
  } else {
    holding = await Holding.create({
      userId,
      symbol,
      quantity,
      investment: totalCost,
    });
  }

  const transaction = await Transaction.create({
    userId,
    symbol,
    quantity,
    price,
    type: "BUY",
  });

  return {
    message: `Successfully bought ${quantity} shares of ${symbol}`,
    transaction,
    balance: user.virtualCash,
    holding,
    executionMethod: method,
    executedPrice: price,
  };
};


const sellStock = async (userId, symbol, quantity, options = {}) => {
  if (quantity <= 0) throw ApiError.badRequest("Quantity must be greater than zero");

  symbol = symbol.toUpperCase();
  const holding = await Holding.findOne({ userId, symbol });
  
  if (!holding) {
    throw ApiError.badRequest(`You do not own any shares of ${symbol}`);
  }
  
  if (holding.quantity < quantity) {
    throw ApiError.badRequest(`You only own ${holding.quantity} shares of ${symbol}`);
  }

  // Resolve the execution price (with quote lock / slippage protection)
  const { price, method } = await resolveExecutionPrice(userId, symbol, options);
  const totalValue = price * quantity;

  const user = await User.findById(userId);
  
  user.virtualCash += totalValue;

  if (holding.quantity === quantity) {
    await Holding.findByIdAndDelete(holding._id);
    
    user.watchlist = user.watchlist.filter(s => s !== symbol);
  } else {
   
    const averageCost = holding.investment / holding.quantity;
    holding.quantity -= quantity;
    holding.investment -= (averageCost * quantity);
    await holding.save();
  }
  
  await user.save();

  const transaction = await Transaction.create({
    userId,
    symbol,
    quantity,
    price,
    type: "SELL",
  });

  return {
    message: `Successfully sold ${quantity} shares of ${symbol}`,
    transaction,
    balance: user.virtualCash,
    remainingQuantity: holding.quantity === quantity ? 0 : holding.quantity,
    executionMethod: method,
    executedPrice: price,
  };
};


const getTransactions = async (userId, filters = {}) => {
  const query = { userId };
  
  if (filters.symbol) {
    query.symbol = filters.symbol.toUpperCase();
  }
  
  if (filters.type) {
    query.type = filters.type.toUpperCase();
  }

  const limit = filters.limit ? parseInt(filters.limit) : 50;

  const transactions = await Transaction.find(query)
    .sort({ timestamp: -1 })
    .limit(limit);

  return transactions;
};

module.exports = {
  buyStock,
  sellStock,
  getTransactions,
  checkSlippage,
  SLIPPAGE_TOLERANCE,
};
