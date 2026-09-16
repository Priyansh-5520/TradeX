import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Activity, Clock3, Lock, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  stockApi,
  tradeApi,
  holdingApi,
  userApi,
  marketApi,
  type MarketStatus,
  type QuoteData,
} from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Trading Dashboard — TradeX" },
      {
        name: "description",
        content: "Practice stock trading with live-style market data on TradeX.",
      },
      { property: "og:title", content: "Trading Dashboard — TradeX" },
      { property: "og:description", content: "A premium risk-free stock trading workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const periodMap: Record<string, string> = {
  "1D": "1d",
  "5D": "5d",
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
  "5Y": "5y",
};
const periods = Object.keys(periodMap);

type ChartPoint = { time: string; price: number };

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [symbol, setSymbol] = useState("AAPL");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [period, setPeriod] = useState("1D");
  const [loading, setLoading] = useState(true);
  const [side, setSide] = useState<"BUY" | "SELL" | null>(null);
  const [cash, setCash] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [market, setMarket] = useState<MarketStatus | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
    }
  }, [authLoading, user, navigate]);

  // Fetch quote
  const fetchQuote = useCallback(async (sym: string) => {
    try {
      const res = await stockApi.getQuote(sym);
      setQuote(res.data);
    } catch (err) {
      console.error("Quote fetch error:", err);
      toast.error("Failed to fetch stock quote");
    }
  }, []);

  // Fetch chart history
  const fetchChart = useCallback(async (sym: string, p: string) => {
    try {
      const backendPeriod = periodMap[p] || "1mo";
      const res = await stockApi.getHistory(sym, backendPeriod);
      const points: ChartPoint[] = res.data.map((pt) => ({
        time: new Date(pt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        price: pt.close,
      }));
      setChartData(points);
    } catch (err) {
      console.error("Chart fetch error:", err);
    }
  }, []);

  // Fetch user stats
  const fetchUserStats = useCallback(async () => {
    try {
      const profileRes = await userApi.getProfile();
      setCash(profileRes.data.virtualCash);

      // Estimate portfolio value from holdings
      const holdingsRes = await holdingApi.getPortfolio();
      setPortfolioValue(holdingsRes.data.summary.totalCurrentValue + profileRes.data.virtualCash);
    } catch (err) {
      console.error("User stats error:", err);
    }
  }, []);

  const fetchMarketStatus = useCallback(async () => {
    try {
      const res = await marketApi.getStatus();
      setMarket(res.data);
    } catch (err) {
      console.error("Market status error:", err);
      setMarket(null);
    } finally {
      setMarketLoading(false);
    }
  }, []);

  // Keep the market state fresh so the page automatically unlocks when the
  // regular session begins (and locks again when it ends).
  useEffect(() => {
    if (!user) return;
    fetchMarketStatus();
    const timer = window.setInterval(fetchMarketStatus, 60_000);
    return () => window.clearInterval(timer);
  }, [user, fetchMarketStatus]);

  // Fetch quote data regardless of whether the market is open so users can see closing prices.
  useEffect(() => {
    if (!user || marketLoading) return;
    setLoading(true);
    Promise.all([
      fetchUserStats(),
      fetchQuote(symbol),
      fetchChart(symbol, period)
    ]).finally(() => setLoading(false));
  }, [user, symbol, period, marketLoading, fetchQuote, fetchChart, fetchUserStats]);

  const choose = (sym: string) => {
    setLoading(true);
    setSymbol(sym);
  };

  const nextOpen = market?.nextOpen
    ? new Date(market.nextOpen).toLocaleString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
        timeZoneName: "short",
      })
    : null;
  const marketMessage = market
    ? `US market is closed. ${nextOpen ? `Next regular session: ${nextOpen}.` : ""}`
    : "Market status is temporarily unavailable.";

  if (authLoading)
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Skeleton className="h-8 w-48" />
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onSelect={(sym: string) => choose(sym)} />
      <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              US Markets
            </p>
            <h1 className="mt-1 text-xl font-semibold">Trading dashboard</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`size-2 rounded-full ${market?.isOpen ? "animate-pulse bg-profit" : "bg-loss"}`}
            />
            {market?.isOpen
              ? "Market open"
              : marketLoading
                ? "Checking market status…"
                : "Market closed"}
            {market?.isOpen && <span className="hidden sm:inline">• Closes 1:30 AM / 2:30 AM IST</span>}
          </div>
        </div>
        {!marketLoading && !market?.isOpen && (
          <div className="mb-4 rounded-md border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">
            {marketMessage}
          </div>
        )}
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <StockInfo
            quote={quote}
            loading={loading}
            onTrade={setSide}
            isMarketOpen={Boolean(market?.isOpen)}
            message={marketMessage}
          />
          <ChartPanel
            quote={quote}
            chartData={chartData}
            period={period}
            setPeriod={setPeriod}
            loading={loading}
            isMarketOpen={Boolean(market?.isOpen)}
            message={marketMessage}
          />
          <Watchlist
            selected={symbol}
            onSelect={choose}
            loading={loading}
            isMarketOpen={Boolean(market?.isOpen)}
            message={marketMessage}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-1">
          <Metric
            label="Cash balance"
            value={`$${cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          />
        </div>
      </main>
      {quote && market?.isOpen && (
        <TradeDialog
          quote={quote}
          side={side}
          onClose={() => setSide(null)}
          onSuccess={fetchUserStats}
        />
      )}
    </div>
  );
}

function StockInfo({
  quote,
  loading,
  onTrade,
  isMarketOpen,
  message,
}: {
  quote: QuoteData | null;
  loading: boolean;
  onTrade: (side: "BUY" | "SELL") => void;
  isMarketOpen: boolean;
  message: string;
}) {
  if (loading || !quote) return <Skeleton className="h-[590px] rounded-lg" />;
  const formatNum = (n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    return n.toLocaleString();
  };
  const rows = [
    ["Day high", `$${quote.dayHigh?.toFixed(2) ?? "—"}`],
    ["Day low", `$${quote.dayLow?.toFixed(2) ?? "—"}`],
    ["Volume", formatNum(quote.volume || 0)],
    ["Market cap", formatNum(quote.marketCap || 0)],
    [
      "52-week range",
      `$${quote.fiftyTwoWeekLow?.toFixed(2) ?? "?"} — $${quote.fiftyTwoWeekHigh?.toFixed(2) ?? "?"}`,
    ],
  ];
  return (
    <section className="panel flex min-h-[590px] flex-col p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-md bg-secondary font-bold text-primary">
            {quote.symbol[0]}
          </span>
          <div>
            <h2 className="font-bold">{quote.symbol}</h2>
            <p className="max-w-36 truncate text-xs text-muted-foreground">{quote.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {quote.priceSource && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${quote.priceSource?.includes("websocket") ? "border border-profit/30 bg-profit/10 text-profit" : "border border-yellow-500/30 bg-yellow-500/10 text-yellow-500"}`}
            >
              {quote.priceSource?.includes("websocket") ? "Real-time" : "Delayed"}
            </span>
          )}
          <Activity className="size-4 text-primary" />
        </div>
      </div>
      <div className="mt-8">
        <p className="text-4xl font-bold tabular-nums">${quote.price?.toFixed(2)}</p>
        <p
          className={`mt-2 flex items-center gap-1 text-sm font-semibold ${(quote.changePercent ?? 0) >= 0 ? "text-profit" : "text-loss"}`}
        >
          {(quote.changePercent ?? 0) >= 0 ? (
            <TrendingUp className="size-4" />
          ) : (
            <TrendingDown className="size-4" />
          )}
          {(quote.changePercent ?? 0) >= 0 ? "+" : ""}
          {quote.changePercent?.toFixed(2)}%
          <span className="font-normal text-muted-foreground">today</span>
        </p>
      </div>
      <div className="my-7 border-t border-border" />
      <dl className="space-y-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-right text-sm font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto grid grid-cols-2 gap-3 pt-8">
        <Button
          onClick={() => onTrade("BUY")}
          disabled={!isMarketOpen}
          className="h-11 bg-profit text-profit-foreground hover:bg-profit/90 disabled:opacity-50"
        >
          Buy
        </Button>
        <Button
          onClick={() => onTrade("SELL")}
          disabled={!isMarketOpen}
          className="h-11 bg-loss text-loss-foreground hover:bg-loss/90 disabled:opacity-50"
        >
          Sell
        </Button>
      </div>
    </section>
  );
}

function ChartPanel({
  quote,
  chartData,
  period,
  setPeriod,
  loading,
  isMarketOpen,
  message,
}: {
  quote: QuoteData | null;
  chartData: ChartPoint[];
  period: string;
  setPeriod: (p: string) => void;
  loading: boolean;
  isMarketOpen: boolean;
  message: string;
}) {

  return (
    <section className="panel min-w-0 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{quote?.name ?? "Loading..."}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Price performance</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-profit/30 bg-profit/10 px-2.5 py-1 text-xs text-profit">
          <span className="size-1.5 animate-pulse rounded-full bg-profit" />
          {quote?.priceSource?.includes("websocket") ? "Real-time" : "Market data"}
        </span>
      </div>
      <div className="mt-5 flex gap-1 overflow-x-auto rounded-md bg-secondary/50 p-1">
        {periods.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={period === item ? "secondary" : "ghost"}
            onClick={() => setPeriod(item)}
            className={period === item ? "text-primary" : "text-muted-foreground"}
          >
            {item}
          </Button>
        ))}
      </div>
      {loading ? (
        <Skeleton className="mt-6 h-[430px]" />
      ) : (
        <div className="mt-5 h-[430px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                domain={["dataMin - 4", "dataMax + 4"]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#priceFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>NASDAQ · USD</span>
        <span>Updated just now</span>
      </div>
    </section>
  );
}



// Watchlist — uses a hardcoded list of popular symbols and fetches live quotes
const WATCHLIST_SYMBOLS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"];

function Watchlist({
  selected,
  onSelect,
  loading,
  isMarketOpen,
  message,
}: {
  selected: string;
  onSelect: (sym: string) => void;
  loading: boolean;
  isMarketOpen: boolean;
  message: string;
}) {
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});

  useEffect(() => {
    WATCHLIST_SYMBOLS.forEach((sym) => {
      stockApi
        .getQuote(sym)
        .then((res) => setQuotes((prev) => ({ ...prev, [sym]: res.data })))
        .catch(() => {
          /* ignore individual failures */
        });
    });
  }, []);



  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h2 className="font-semibold">Watchlist</h2>
          <p className="text-xs text-muted-foreground">{WATCHLIST_SYMBOLS.length} instruments</p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {WATCHLIST_SYMBOLS.map((sym) => {
          const q = quotes[sym];
          if (loading && !q)
            return (
              <div key={sym} className="p-4">
                <Skeleton className="h-12" />
              </div>
            );
          return (
            <button
              key={sym}
              onClick={() => onSelect(sym)}
              className={`flex w-full items-center justify-between gap-2 p-4 text-left transition-colors hover:bg-accent/60 ${selected === sym ? "bg-primary/7" : ""}`}
            >
              <div>
                <p className="text-sm font-bold">{sym}</p>
                <p className="max-w-24 truncate text-xs text-muted-foreground">
                  {q?.name ?? "..."}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">${q?.price?.toFixed(2) ?? "—"}</p>
                <p
                  className={`text-xs ${(q?.changePercent ?? 0) >= 0 ? "text-profit" : "text-loss"}`}
                >
                  {(q?.changePercent ?? 0) >= 0 ? "+" : ""}
                  {q?.changePercent?.toFixed(2) ?? "0.00"}%
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <div className="panel flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-lg font-bold tabular-nums ${positive ? "text-profit" : ""}`}>
          {value}
        </p>
      </div>
      {change && <span className="text-xs text-profit">{change}</span>}
    </div>
  );
}

function TradeDialog({
  quote,
  side,
  onClose,
  onSuccess,
}: {
  quote: QuoteData;
  side: "BUY" | "SELL" | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [lockedPrice, setLockedPrice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const locked = countdown > 0;

  useEffect(() => {
    if (!side) {
      setCountdown(0);
      setQuantity(1);
      setQuoteId(null);
      setLockedPrice(null);
    }
  }, [side]);
  useEffect(() => {
    if (!countdown) return;
    const timer = window.setInterval(
      () =>
        setCountdown((v) => {
          if (v <= 1) {
            setQuoteId(null);
            setLockedPrice(null);
          }
          return Math.max(0, v - 1);
        }),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [countdown]);

  const displayPrice = lockedPrice ?? quote.price;
  const total = useMemo(() => displayPrice * Math.max(0, quantity), [displayPrice, quantity]);

  const handleLock = async () => {
    try {
      const res = await tradeApi.lockQuote(quote.symbol);
      setQuoteId(res.data.quoteId);
      setLockedPrice(res.data.price);
      setCountdown(10);
      toast.success("Price locked!", {
        description: `$${res.data.price.toFixed(2)} for 10 seconds`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to lock price";
      toast.error(message);
    }
  };

  const confirm = async () => {
    setSubmitting(true);
    try {
      const opts = quoteId ? { quoteId } : { expectedPrice: quote.price };
      const fn = side === "BUY" ? tradeApi.buy : tradeApi.sell;
      const res = await fn(quote.symbol, quantity, opts);
      toast.success(`${side === "BUY" ? "Purchase" : "Sale"} completed!`, {
        description: `${quantity} ${quote.symbol} at $${displayPrice.toFixed(2)} · ${locked ? "Locked quote" : "Market price"}`,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Trade failed";
      toast.error("Trade failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(side)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-border bg-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {side === "BUY" ? "Buy" : "Sell"} {quote.symbol}
          </DialogTitle>
          <DialogDescription>
            {quote.name} · {locked ? "Locked quote" : "Market order"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="rounded-md border border-border bg-secondary/40 p-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {locked ? "Locked price" : "Current price"}
              </span>
              <b className="tabular-nums">${displayPrice.toFixed(2)}</b>
            </div>
          </div>
          <div>
            <label htmlFor="quantity" className="mb-2 block text-sm font-medium">
              Quantity
            </label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="h-11"
            />
          </div>
          <div className="flex items-end justify-between border-y border-border py-4">
            <div>
              <p className="text-xs text-muted-foreground">Estimated total</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                $
                {total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {locked ? "Locked quote" : "Market price"}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={handleLock}
            disabled={locked}
            className="h-11 w-full border-primary/30 text-primary hover:bg-primary/10"
          >
            {locked ? (
              <>
                <Clock3 />
                Locked for {countdown}s
              </>
            ) : (
              <>
                <Lock />
                Lock price for 10 seconds
              </>
            )}
          </Button>
        </div>
        <DialogFooter>
          <Button
            onClick={confirm}
            disabled={quantity < 1 || submitting}
            className={`h-11 w-full ${side === "SELL" ? "bg-loss text-loss-foreground hover:bg-loss/90" : "bg-profit text-profit-foreground hover:bg-profit/90"}`}
          >
            {submitting ? "Processing..." : `Confirm ${side}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
