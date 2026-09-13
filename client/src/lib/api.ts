// ─── API Client for TradeX Backend ───
// All API calls go through here so the JWT token is attached automatically.

// In local development this is proxied by Vite to the Express server.  Set
// VITE_API_URL (for example, https://api.example.com/api) when the two apps
// are deployed on different origins.
const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tradex_token");
}

export function setToken(token: string) {
  localStorage.setItem("tradex_token", token);
}

export function clearToken() {
  localStorage.removeItem("tradex_token");
}

async function request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || json.message || `Request failed (${res.status})`);
  }

  return json as T;
}

// ─── Auth ───
export const authApi = {
  googleLogin: (idToken: string) =>
    request<{ isNewUser: boolean; token?: string; user?: UserData; email?: string }>(
      "/auth/google",
      { method: "POST", body: JSON.stringify({ idToken }) },
    ),

  completeSignup: (idToken: string, userName: string) =>
    request<{ token: string; user: UserData }>("/auth/complete-signup", {
      method: "POST",
      body: JSON.stringify({ idToken, userName }),
    }),

  checkUsername: (userName: string) =>
    request<{ available: boolean }>(`/auth/check-username/${userName}`),

  getMe: () => request<{ user: UserData }>("/auth/me"),
};

// ─── Stocks ───
export const stockApi = {
  getQuote: (symbol: string) =>
    request<{ success: boolean; data: QuoteData }>(`/stocks/quote/${symbol}`),

  search: (q: string) =>
    request<{ success: boolean; count: number; data: SearchResult[] }>(
      `/stocks/search?q=${encodeURIComponent(q)}`,
    ),

  getHistory: (symbol: string, period = "1mo") =>
    request<{ success: boolean; data: HistoryPoint[] }>(
      `/stocks/history/${symbol}?period=${period}`,
    ),
};

export const marketApi = {
  getStatus: () => request<{ success: boolean; data: MarketStatus }>("/market/status"),
};

// ─── Trade ───
export const tradeApi = {
  lockQuote: (symbol: string) =>
    request<{ success: boolean; data: QuoteLock }>("/trade/lock-quote", {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),

  buy: (symbol: string, quantity: number, opts?: { quoteId?: string; expectedPrice?: number }) =>
    request<{ success: boolean; message: string }>("/trade/buy", {
      method: "POST",
      body: JSON.stringify({ symbol, quantity, ...opts }),
    }),

  sell: (symbol: string, quantity: number, opts?: { quoteId?: string; expectedPrice?: number }) =>
    request<{ success: boolean; message: string }>("/trade/sell", {
      method: "POST",
      body: JSON.stringify({ symbol, quantity, ...opts }),
    }),
};

// ─── Holdings ───
export const holdingApi = {
  getPortfolio: () => request<{ success: boolean; data: PortfolioData }>("/holdings"),
};

// ─── User ───
export const userApi = {
  getProfile: () => request<{ success: boolean; data: ProfileData }>("/user/profile"),
};

// ─── Transactions ───
export const transactionApi = {
  getAll: (filters?: { symbol?: string; type?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.symbol) params.set("symbol", filters.symbol);
    if (filters?.type) params.set("type", filters.type);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return request<{ success: boolean; count: number; data: TransactionData[] }>(
      `/transactions${qs ? `?${qs}` : ""}`,
    );
  },
};

// ─── Types ───
export type UserData = {
  id: string;
  email: string;
  userName: string;
  virtualCash: number;
  createdAt: string;
};

export type QuoteData = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  priceSource?: string;
  priceAgeMs?: number;
};

export type MarketStatus = {
  isOpen: boolean;
  nextOpen: string;
  nextClose: string;
  source: string;
};

export type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
};

export type HistoryPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type QuoteLock = {
  quoteId: string;
  symbol: string;
  price: number;
  lockedAt: string;
  expiresAt: string;
  ttlMs: number;
  priceSource: string;
};

export type HoldingData = {
  id: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  totalInvestment: number;
  currentPrice: number;
  currentValue: number;
  profit: number;
  profitPercentage: number;
};

export type PortfolioData = {
  holdings: HoldingData[];
  summary: {
    totalInvested: number;
    totalCurrentValue: number;
    totalProfit: number;
    profitPercentage: number;
  };
};

export type ProfileData = {
  userName: string;
  email: string;
  virtualCash: number;
  createdAt: string;
};

export type TransactionData = {
  _id: string;
  symbol: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
};
