/**
 * Quote Lock Service — Locks a price for a user for a short TTL.
 *
 * When a user sees a price on their screen and wants to trade,
 * they first request a "quote lock" which freezes that price
 * for QUOTE_LOCK_TTL_MS (default 10s). The trade is then
 * executed at the locked price if it's still within slippage tolerance.
 */

const crypto = require("crypto");

/** In-memory store for locked quotes. */
const locks = new Map();

/** Default TTL for a locked quote (10 seconds). */
const DEFAULT_TTL_MS = parseInt(process.env.QUOTE_LOCK_TTL_MS) || 10_000;

/** Cleanup interval — sweep expired locks every 30 seconds. */
setInterval(() => {
  const now = Date.now();
  for (const [id, lock] of locks) {
    if (now > lock.expiresAt) {
      locks.delete(id);
    }
  }
}, 30_000);

/**
 * Create a new quote lock.
 * @param {string} symbol - Stock ticker
 * @param {number} price - The price to lock
 * @param {string} userId - User requesting the lock
 * @returns {Object} Lock details { quoteId, symbol, price, lockedAt, expiresAt }
 */
const createLock = (symbol, price, userId) => {
  const quoteId = crypto.randomUUID();
  const now = Date.now();

  const lock = {
    quoteId,
    symbol: symbol.toUpperCase(),
    price,
    userId,
    lockedAt: now,
    expiresAt: now + DEFAULT_TTL_MS,
  };

  locks.set(quoteId, lock);

  return {
    quoteId: lock.quoteId,
    symbol: lock.symbol,
    price: lock.price,
    lockedAt: new Date(lock.lockedAt).toISOString(),
    expiresAt: new Date(lock.expiresAt).toISOString(),
    ttlMs: DEFAULT_TTL_MS,
  };
};

/**
 * Validate and consume a quote lock.
 * Once validated, the lock is consumed (deleted) — it can only be used once.
 *
 * @param {string} quoteId - The lock ID
 * @param {string} userId - The user trying to use the lock
 * @param {string} symbol - The symbol being traded (must match the lock)
 * @returns {{ valid: boolean, lock?: Object, error?: string }}
 */
const validateLock = (quoteId, userId, symbol) => {
  const lock = locks.get(quoteId);

  if (!lock) {
    return { valid: false, error: "Quote lock not found or already used" };
  }

  if (lock.userId !== userId) {
    return { valid: false, error: "Quote lock belongs to a different user" };
  }

  if (lock.symbol !== symbol.toUpperCase()) {
    return {
      valid: false,
      error: `Quote lock is for ${lock.symbol}, not ${symbol.toUpperCase()}`,
    };
  }

  if (Date.now() > lock.expiresAt) {
    locks.delete(quoteId);
    return {
      valid: false,
      error: "Quote lock has expired. Request a new quote.",
    };
  }

  // Consume the lock (one-time use)
  locks.delete(quoteId);

  return { valid: true, lock };
};

/**
 * Get info about a lock (without consuming it).
 * @param {string} quoteId
 * @returns {Object | null}
 */
const getLock = (quoteId) => {
  const lock = locks.get(quoteId);
  if (!lock) return null;

  return {
    ...lock,
    expired: Date.now() > lock.expiresAt,
    remainingMs: Math.max(0, lock.expiresAt - Date.now()),
  };
};

/**
 * Get count of active (non-expired) locks.
 * @returns {number}
 */
const activeCount = () => {
  const now = Date.now();
  let count = 0;
  for (const lock of locks.values()) {
    if (now <= lock.expiresAt) count++;
  }
  return count;
};

module.exports = {
  createLock,
  validateLock,
  getLock,
  activeCount,
  DEFAULT_TTL_MS,
};
