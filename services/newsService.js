const YahooFinance = require("yahoo-finance2").default;
const yahooFinance = new YahooFinance();

/** In-memory cache for news items (5 minute TTL). */
const newsCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Clean up expired news cache entries every 10 minutes.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of newsCache.entries()) {
    if (now > entry.expiresAt) {
      newsCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Get relative time string (e.g. "2h ago", "15m ago", "Yesterday").
 * @param {Date|string} date
 * @returns {string}
 */
const getRelativeTime = (date) => {
  if (!date) return "";
  const now = Date.now();
  const diffMs = now - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * Fetch and normalize news articles for a given stock symbol or general query.
 * @param {string} query - Symbol (e.g., "AAPL", "RELIANCE.NS") or search term
 * @param {number} count - Maximum articles to return (default 8)
 * @returns {Promise<Array>} Normalized list of news articles
 */
const getNews = async (query = "stock market", count = 8) => {
  const cleanQuery = (query || "stock market").trim();
  const cacheKey = `${cleanQuery.toUpperCase()}_${count}`;

  // Check cache
  const cached = newsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    let result = await yahooFinance.search(cleanQuery, { newsCount: count });
    let newsItems = result?.news || [];

    // Fallback: Indian tickers like RELIANCE.NS might return 0 news when searched with suffix.
    // Strip .NS/.BO and search again if initial result was empty.
    if (newsItems.length === 0 && /\.(NS|BO)$/i.test(cleanQuery)) {
      const strippedSymbol = cleanQuery.replace(/\.(NS|BO)$/i, "");
      const fallbackResult = await yahooFinance.search(strippedSymbol, { newsCount: count });
      if (fallbackResult?.news?.length > 0) {
        newsItems = fallbackResult.news;
      }
    }

    // Secondary fallback: If still empty for specific ticker, get general market news
    if (newsItems.length === 0 && cleanQuery.toLowerCase() !== "stock market") {
      const marketResult = await yahooFinance.search("stock market", { newsCount: count });
      newsItems = marketResult?.news || [];
    }

    const formatted = newsItems.slice(0, count).map((item) => {
      // Extract highest resolution thumbnail if available
      let thumbnailUrl = null;
      if (item.thumbnail?.resolutions?.length > 0) {
        const sorted = [...item.thumbnail.resolutions].sort((a, b) => (b.width || 0) - (a.width || 0));
        thumbnailUrl = sorted[0]?.url || null;
      }

      return {
        id: item.uuid || `${item.publisher}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: item.title,
        publisher: item.publisher || "Financial News",
        link: item.link,
        publishedAt: item.providerPublishTime,
        timeAgo: getRelativeTime(item.providerPublishTime),
        thumbnailUrl,
        type: item.type || "STORY",
        relatedTickers: item.relatedTickers || [],
      };
    });

    // Save to cache
    newsCache.set(cacheKey, {
      data: formatted,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return formatted;
  } catch (error) {
    console.error(`Failed to fetch news for ${cleanQuery}:`, error.message);
    return [];
  }
};

module.exports = {
  getNews,
};
