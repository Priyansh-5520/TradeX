/**
 * Price Cache — In-memory real-time price store.
 *
 * The Alpaca WebSocket stream pushes price updates into this cache.
 * All services read from here for the freshest available price.
 *
 * Structure: { symbol: { price, timestamp, source } }
 */

const cache = new Map();

/** Maximum age (ms) before a cached price is considered stale. */
const MAX_AGE_MS = 30_000; // 30 seconds

/**
 * Update the cached price for a symbol.
 * @param {string} symbol - Stock ticker (uppercase)
 * @param {number} price - Latest price
 * @param {string} [source="websocket"] - Where this price came from
 */
const setPrice = (symbol, price, source = "websocket") => {
  cache.set(symbol.toUpperCase(), {
    price,
    timestamp: Date.now(),
    source,
  });
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
  MAX_AGE_MS,
};
