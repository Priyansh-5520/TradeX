const watchlistService = require("../services/watchlistService");

const getWatchlist = async (req, res, next) => {
  try { res.json({ success: true, data: await watchlistService.getWatchlist(req.user.id) }); } catch (error) { next(error); }
};
const addSymbol = async (req, res, next) => {
  try { res.json({ success: true, data: await watchlistService.addSymbol(req.user.id, req.body.symbol) }); } catch (error) { next(error); }
};
const removeSymbol = async (req, res, next) => {
  try { res.json({ success: true, data: await watchlistService.removeSymbol(req.user.id, req.params.symbol) }); } catch (error) { next(error); }
};
const reorderWatchlist = async (req, res, next) => {
  try { res.json({ success: true, data: await watchlistService.reorderWatchlist(req.user.id, req.body.watchlist) }); } catch (error) { next(error); }
};

module.exports = { getWatchlist, addSymbol, removeSymbol, reorderWatchlist };
