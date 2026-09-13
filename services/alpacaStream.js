/**
 * Alpaca WebSocket Stream — Real-time market data via Alpaca's IEX feed.
 *
 * Maintains a persistent WebSocket connection that pushes live trade/bar
 * updates into the priceCache. Auto-reconnects on disconnect.
 *
 * Requires ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY in .env
 */

const { Alpaca } = require("@alpacahq/alpaca-trade-api");
const priceCache = require("./priceCache");

let alpaca = null;
let stockStream = null;
let subscribedSymbols = new Set();
let isConnected = false;
let reconnectTimer = null;

/**
 * Initialize the Alpaca client.
 */
const initClient = () => {
  if (!process.env.ALPACA_API_KEY_ID || !process.env.ALPACA_API_SECRET_KEY) {
    console.warn(
      "⚠️  ALPACA_API_KEY_ID or ALPACA_API_SECRET_KEY not set. Real-time streaming disabled."
    );
    return false;
  }

  alpaca = new Alpaca({
    keyId: process.env.ALPACA_API_KEY_ID,
    secret: process.env.ALPACA_API_SECRET_KEY,
    paper: true,
  });

  return true;
};

/**
 * Connect to the Alpaca WebSocket and start receiving real-time data.
 * @param {string[]} [initialSymbols=[]] - Symbols to subscribe on connect
 */
const connect = (initialSymbols = []) => {
  if (!alpaca && !initClient()) {
    console.log("ℹ️  Alpaca not configured. Using REST fallback for prices.");
    return;
  }

  try {
    // Create the stock stream using IEX feed (free tier)
    stockStream = alpaca.marketData.stockStream({ feed: "iex" });

    // Handle incoming bar updates (1-minute candles with OHLCV)
    stockStream.onBar((bar) => {
      priceCache.setPrice(bar.symbol, bar.close, "websocket-bar");
    });

    // Handle incoming trade updates (individual trades — most granular)
    stockStream.onTrade((trade) => {
      priceCache.setPrice(trade.symbol, trade.price, "websocket-trade");
    });

    // Handle connection
    stockStream.onConnect(() => {
      isConnected = true;
      console.log("✅ Alpaca WebSocket connected — real-time data streaming");

      // Subscribe to initial symbols
      if (initialSymbols.length > 0) {
        subscribe(initialSymbols);
      }
    });

    // Handle disconnection
    stockStream.onDisconnect(() => {
      isConnected = false;
      console.warn("⚠️  Alpaca WebSocket disconnected");
      scheduleReconnect();
    });

    // Handle errors
    stockStream.onError((err) => {
      console.error("❌ Alpaca WebSocket error:", err.message || err);
    });

    // Connect
    stockStream.connect();
    console.log("🔌 Connecting to Alpaca real-time stream...");
  } catch (error) {
    console.error("❌ Failed to initialize Alpaca stream:", error.message);
    scheduleReconnect();
  }
};

/**
 * Schedule a reconnection attempt with exponential backoff.
 */
const scheduleReconnect = () => {
  if (reconnectTimer) return;

  const delay = 5000; // 5 seconds
  console.log(`🔄 Reconnecting to Alpaca in ${delay / 1000}s...`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(Array.from(subscribedSymbols));
  }, delay);
};

/**
 * Subscribe to real-time updates for additional symbols.
 * @param {string[]} symbols - Stock tickers to subscribe to
 */
const subscribe = (symbols) => {
  if (!symbols || symbols.length === 0) return;

  const upperSymbols = symbols.map((s) => s.toUpperCase());
  const newSymbols = upperSymbols.filter((s) => !subscribedSymbols.has(s));

  if (newSymbols.length === 0) return;

  newSymbols.forEach((s) => subscribedSymbols.add(s));

  if (isConnected && stockStream) {
    try {
      // Subscribe to both trades (granular) and bars (OHLCV)
      stockStream.subscribeForTrades(newSymbols);
      stockStream.subscribeForBars(newSymbols);
      console.log(`📡 Subscribed to real-time data: ${newSymbols.join(", ")}`);
    } catch (error) {
      console.error("❌ Failed to subscribe:", error.message);
    }
  }
};

/**
 * Unsubscribe from symbols.
 * @param {string[]} symbols
 */
const unsubscribe = (symbols) => {
  if (!symbols || symbols.length === 0) return;

  const upperSymbols = symbols.map((s) => s.toUpperCase());
  upperSymbols.forEach((s) => subscribedSymbols.delete(s));

  if (isConnected && stockStream) {
    try {
      stockStream.unsubscribeFromTrades(upperSymbols);
      stockStream.unsubscribeFromBars(upperSymbols);
      console.log(`🔇 Unsubscribed from: ${upperSymbols.join(", ")}`);
    } catch (error) {
      console.error("❌ Failed to unsubscribe:", error.message);
    }
  }
};

/**
 * Disconnect from the WebSocket stream.
 */
const disconnect = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (stockStream) {
    try {
      stockStream.disconnect();
    } catch (_) {}
    stockStream = null;
  }

  isConnected = false;
  console.log("🔌 Alpaca WebSocket disconnected");
};

/**
 * Fetch a one-time snapshot price via Alpaca REST (fallback when cache miss).
 * @param {string} symbol
 * @returns {Promise<number | null>}
 */
const getSnapshotPrice = async (symbol) => {
  if (!alpaca && !initClient()) return null;

  try {
    const snapshot = await alpaca.marketData.stocks.stockLatestTrade({
      symbols: symbol.toUpperCase(),
      feed: "iex",
    });

    // The response is keyed by symbol
    const trade = snapshot.trades?.[symbol.toUpperCase()];
    if (trade && trade.price) {
      const price =
        typeof trade.price === "string"
          ? parseFloat(trade.price)
          : trade.price;
      priceCache.setPrice(symbol, price, "rest-snapshot");
      return price;
    }

    return null;
  } catch (error) {
    console.error(
      `❌ Alpaca REST snapshot failed for ${symbol}:`,
      error.message
    );
    return null;
  }
};

/**
 * Get stream status info.
 * @returns {Object}
 */
const getStatus = () => ({
  connected: isConnected,
  subscribedSymbols: Array.from(subscribedSymbols),
  cachedPrices: priceCache.size(),
});

/**
 * Return Alpaca's official US market clock. It includes exchange holidays and
 * early closes, unlike a basic weekday/time calculation.
 */
const getMarketStatus = async () => {
  if (!alpaca && !initClient()) return null;

  try {
    const clock = await alpaca.trading.clock.legacyClock();
    return {
      isOpen: clock.isOpen,
      nextOpen: clock.nextOpen,
      nextClose: clock.nextClose,
      source: "alpaca",
    };
  } catch (error) {
    console.warn("Could not retrieve Alpaca market clock:", error.message);
    return null;
  }
};

module.exports = {
  connect,
  subscribe,
  unsubscribe,
  disconnect,
  getSnapshotPrice,
  getStatus,
  getMarketStatus,
  initClient,
};
