const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const getWatchlist = async (userId) => {
  const user = await User.findById(userId).select("watchlist");
  if (!user) throw ApiError.notFound("User not found");
  return user.watchlist || [];
};

const addSymbol = async (userId, symbol) => {
  const normalized = String(symbol || "").trim().toUpperCase();
  if (!/^[A-Z0-9.^-]+$/.test(normalized)) throw ApiError.badRequest("Enter a valid stock symbol");
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");
  if (!user.watchlist.includes(normalized)) {
    const watchlist = [...user.watchlist, normalized];
    await User.updateOne({ _id: userId }, { $set: { watchlist } });
    return watchlist;
  }
  return user.watchlist;
};

const removeSymbol = async (userId, symbol) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");
  const watchlist = user.watchlist.filter((item) => item !== String(symbol).toUpperCase());
  await User.updateOne({ _id: userId }, { $set: { watchlist } });
  return watchlist;
};

const reorderWatchlist = async (userId, watchlist) => {
  if (!Array.isArray(watchlist)) throw ApiError.badRequest("watchlist must be an array");
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");
  const requested = watchlist.map((symbol) => String(symbol).toUpperCase());
  const current = user.watchlist || [];
  if (requested.length !== current.length || new Set(requested).size !== current.length || requested.some((symbol) => !current.includes(symbol))) {
    throw ApiError.badRequest("Invalid watchlist order");
  }
  await User.updateOne({ _id: userId }, { $set: { watchlist: requested } });
  return requested;
};

module.exports = { getWatchlist, addSymbol, removeSymbol, reorderWatchlist };
