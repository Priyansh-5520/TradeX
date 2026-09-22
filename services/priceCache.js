/**
 * Price Cache — In-memory real-time price store.
 *
 * The Alpaca WebSocket stream pushes price updates into this cache.
 * All services read from here for the freshest available price.
 * Emits "update" events so SSE endpoints can push to clients instantly.
 *
 * Structure: { symbol: { price, timestamp, source } }
 */

const { EventEmitter } = require("events");

const cache = new Map();
const priceEmitter = new EventEmitter();
priceEmitter.setMaxListeners(500); // Support many concurrent SSE clients

/** Maximum age (ms) before a cached price is considered stale. */
const MAX_AGE_MS = 30_000; // 30 seconds

/**
 * Update the cached price for a symbol.
 * Emits an "update" event so SSE listeners can push instantly.
 * @param {string} symbol - Stock ticker (uppercase)
 * @param {number} price - Latest price
 * @param {string} [source="websocket"] - Where this price came from
 */
const setPrice = (symbol, price, source = "websocket") => {
  const sym = symbol.toUpperCase();
  cache.set(sym, {
    price,
    timestamp: Date.now(),
    source,
  });
  priceEmitter.emit("update", { symbol: sym, price, source });
};

/**
 * Get the cached price for a symbol.
 * @param {string} symbol - Stock ticker
 * @returns {{ price: number, timestamp: number, source: string, ageMs: number } | null}
 */
const getPrice = (symbol) => {
  const entry = cache.get(symbol.toUpperCase());
  if (!entry) return null;

  return {
    ...entry,
    ageMs: Date.now() - entry.timestamp,
  };
};

/**
 * Check if a cached price is fresh (not stale).
 * @param {string} symbol - Stock ticker
 * @returns {boolean}
 */
const isFresh = (symbol) => {
  const entry = getPrice(symbol);
  if (!entry) return false;
  return entry.ageMs < MAX_AGE_MS;
};

/**
 * Get the fresh price value, or null if stale/missing.
 * @param {string} symbol
 * @returns {number | null}
 */
const getFreshPrice = (symbol) => {
  const entry = getPrice(symbol);
  if (!entry || entry.ageMs >= MAX_AGE_MS) return null;
  return entry.price;
};

/**
 * Get all cached prices (for debugging/monitoring).
 * @returns {Object}
 */
const getAllPrices = () => {
  const result = {};
  for (const [symbol, entry] of cache) {
    result[symbol] = {
      ...entry,
      ageMs: Date.now() - entry.timestamp,
    };
  }
  return result;
};

/**
 * Remove a symbol from the cache.
 * @param {string} symbol
 */
const removePrice = (symbol) => {
  cache.delete(symbol.toUpperCase());
};

/**
 * Clear the entire cache.
 */
const clearAll = () => {
  cache.clear();
};

/**
 * Get the number of symbols in the cache.
 * @returns {number}
 */
const size = () => cache.size;

module.exports = {
  setPrice,
  getPrice,
  isFresh,
  getFreshPrice,
  getAllPrices,
  removePrice,
  clearAll,
  size,
  priceEmitter,
  MAX_AGE_MS,
};
