/**
 * SSE Stream Route — Server-Sent Events for real-time price updates.
 *
 * Clients connect to GET /api/stream/prices?symbols=AAPL,TSLA and receive
 * a persistent HTTP stream. When the priceCache receives a new price from
 * Alpaca's WebSocket, it emits an event, and this route pushes it to
 * every connected client watching that symbol — instantly.
 *
 * This eliminates HTTP polling entirely (like TradingView does).
 */

const express = require("express");
const router = express.Router();
const priceCache = require("../services/priceCache");
const alpacaStream = require("../services/alpacaStream");

/**
 * GET /api/stream/prices?symbols=AAPL,TSLA,NVDA
 *
 * Opens an SSE connection. The server pushes JSON messages whenever a
 * subscribed symbol's price updates in the cache.
 */
router.get("/prices", (req, res) => {
  const symbolsParam = req.query.symbols;
  if (!symbolsParam) {
    return res.status(400).json({ error: "symbols query parameter is required" });
  }

  const symbols = new Set(
    symbolsParam
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  );

  if (symbols.size === 0) {
    return res.status(400).json({ error: "At least one valid symbol is required" });
  }

  // ── SSE Headers ──
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable Nginx buffering if behind a proxy
  });

  // Send an initial comment to establish the connection
  res.write(":ok\n\n");

  // Ensure Alpaca is streaming these symbols
  alpacaStream.subscribe(Array.from(symbols));

  // Send the current cached prices immediately so the client doesn't start blank
  for (const sym of symbols) {
    const cached = priceCache.getPrice(sym);
    if (cached) {
      const payload = JSON.stringify({
        symbol: sym,
        price: cached.price,
        source: cached.source,
        timestamp: cached.timestamp,
      });
      res.write(`data: ${payload}\n\n`);
    }
  }

  // ── Listen for live updates ──
  const onUpdate = ({ symbol, price, source }) => {
    if (!symbols.has(symbol)) return;
    const payload = JSON.stringify({
      symbol,
      price,
      source,
      timestamp: Date.now(),
    });
    res.write(`data: ${payload}\n\n`);
  };

  priceCache.priceEmitter.on("update", onUpdate);

  // ── Keep-alive heartbeat every 15s to prevent proxies from closing ──
  const heartbeat = setInterval(() => {
    res.write(":heartbeat\n\n");
  }, 15_000);

  // ── Cleanup on disconnect ──
  req.on("close", () => {
    priceCache.priceEmitter.removeListener("update", onUpdate);
    clearInterval(heartbeat);
  });
});

module.exports = router;
