require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const stockRoutes = require("./routes/stockRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const holdingRoutes = require("./routes/holdingRoutes");
const userRoutes = require("./routes/userRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const errorHandler = require("./middleware/errorHandler");
const { startDailySnapshotJob } = require("./services/analysisService");
const alpacaStream = require("./services/alpacaStream");
const User = require("./models/User");
const Holding = require("./models/Holding");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/holdings", holdingRoutes);
app.use("/api/user", userRoutes);
app.use("/api/transactions", transactionRoutes);

app.get("/api/market/status", async (req, res, next) => {
  try {
    const market = await alpacaStream.getMarketStatus();
    if (!market) {
      return res.status(503).json({ success: false, error: "Market status is unavailable" });
    }
    return res.status(200).json({ success: true, data: market });
  } catch (error) {
    next(error);
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Stream status endpoint (for monitoring)
app.get("/api/stream-status", (req, res) => {
  res.status(200).json({
    success: true,
    data: alpacaStream.getStatus(),
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

/**
 * Collect all unique symbols from users' watchlists and active holdings.
 * These are the symbols we want real-time data for on startup.
 */
const getActiveSymbols = async () => {
  try {
    // Get all unique symbols from watchlists
    const users = await User.find({}, "watchlist").lean();
    const watchlistSymbols = users.flatMap((u) => u.watchlist || []);

    // Get all unique symbols from active holdings
    const holdings = await Holding.distinct("symbol");

    // Combine and deduplicate
    const allSymbols = [...new Set([...watchlistSymbols, ...holdings])];
    return allSymbols;
  } catch (error) {
    console.warn("⚠️  Could not fetch active symbols:", error.message);
    return [];
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Start background jobs
    startDailySnapshotJob();

    // Start Alpaca real-time stream
    const activeSymbols = await getActiveSymbols();
    if (activeSymbols.length > 0) {
      console.log(
        `📊 Found ${activeSymbols.length} active symbols: ${activeSymbols.slice(0, 10).join(", ")}${activeSymbols.length > 10 ? "..." : ""}`
      );
    }
    alpacaStream.connect(activeSymbols);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error(`❌ Failed to connect MongoDB: ${err.message}`);
    process.exit(1);
  }
};

connectDB();
