const mongoose = require("mongoose");
const User = require("../models/User");
const Holding = require("../models/Holding");
const Transaction = require("../models/Transaction");
const stockService = require("./stockService");
const ApiError = require("../utils/ApiError");


const buyStock = async (userId, symbol, quantity) => {
  if (quantity <= 0) throw ApiError.badRequest("Quantity must be greater than zero");

  symbol = symbol.toUpperCase();
  const price = await stockService.getLivePrice(symbol);
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
  };
};


const sellStock = async (userId, symbol, quantity) => {
  if (quantity <= 0) throw ApiError.badRequest("Quantity must be greater than zero");

  symbol = symbol.toUpperCase();
  const holding = await Holding.findOne({ userId, symbol });
  
  if (!holding) {
    throw ApiError.badRequest(`You do not own any shares of ${symbol}`);
  }
  
  if (holding.quantity < quantity) {
    throw ApiError.badRequest(`You only own ${holding.quantity} shares of ${symbol}`);
  }

  const price = await stockService.getLivePrice(symbol);
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
    remainingQuantity: holding.quantity === quantity ? 0 : holding.quantity
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
  getTransactions
};
