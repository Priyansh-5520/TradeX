import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TradeXLogo } from "@/components/tradex-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  userApi,
  holdingApi,
  transactionApi,
  type HoldingData,
  type TransactionData,
} from "@/lib/api";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Portfolio Profile — TradeX" },
      {
        name: "description",
        content: "Review your TradeX portfolio, holdings, transactions, and performance.",
      },
      { property: "og:title", content: "Portfolio Profile — TradeX" },
      {
        property: "og:description",
        content: "Your paper trading portfolio and performance analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cash, setCash] = useState(0);
  const [holdings, setHoldings] = useState<HoldingData[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [type, setType] = useState("ALL");
  const [symbol, setSymbol] = useState("ALL");
  const [sortAsc, setSortAsc] = useState(false);
  const [memberSince, setMemberSince] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch user profile
      const profileRes = await userApi.getProfile();
      setCash(profileRes.data.virtualCash);
      setMemberSince(
        new Date(profileRes.data.createdAt).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      );

      // The backend already enriches holdings with live prices and P&L.
      const holdingsRes = await holdingApi.getPortfolio();
      setHoldings(holdingsRes.data.holdings);

      // Fetch transactions
      const txRes = await transactionApi.getAll({ limit: 50 });
      setTransactions(txRes.data);
    } catch (err) {
      console.error("Profile data error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const portfolioValue = useMemo(
    () => holdings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0) + cash,
    [holdings, cash],
  );

  const totalPnL = useMemo(() => holdings.reduce((sum, h) => sum + h.profit, 0), [holdings]);

  const allocation = useMemo(
    () =>
      holdings.map((h, i) => ({
        name: h.symbol,
        value: h.currentPrice * h.quantity,
        color: CHART_COLORS[i % CHART_COLORS.length],
      })),
    [holdings],
  );

  const filtered = useMemo(
    () =>
      transactions
        .filter(
          (t) => (type === "ALL" || t.type === type) && (symbol === "ALL" || t.symbol === symbol),
        )
        .toSorted((a, b) => (sortAsc ? a.price - b.price : b.price - a.price)),
    [transactions, type, symbol, sortAsc],
  );

  const uniqueSymbols = useMemo(
    () => [...new Set(transactions.map((t) => t.symbol))],
    [transactions],
  );

  const initials = user?.userName?.slice(0, 2).toUpperCase() ?? "??";

  if (authLoading || loading)
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Skeleton className="h-8 w-48" />
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <TradeXLogo />
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link to="/dashboard">
                <ArrowLeft />
                Back to trading
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground text-xs"
              onClick={() => {
                logout();
                navigate({ to: "/" });
              }}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* User info */}
        <section className="flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2 border-primary/30">
              <AvatarFallback className="bg-primary/15 text-lg font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{user?.userName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" />
                Member since {memberSince}
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full border border-profit/25 bg-profit/10 px-3 py-1 text-xs font-semibold text-profit">
            Verified trader
          </span>
        </section>

        {/* Summary cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Summary
            icon={Wallet}
            label="Cash balance"
            value={`$${cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          />
          <Summary
            icon={CircleDollarSign}
            label="Portfolio value"
            value={`$${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          />
          <Summary
            icon={ChevronDown}
            label="Total P&L"
            value={`${totalPnL >= 0 ? "+" : ""}$${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            profit={totalPnL >= 0}
            caption={
              holdings.length > 0
                ? `${((totalPnL / (portfolioValue - totalPnL)) * 100).toFixed(2)}% all time`
                : undefined
            }
          />
        </div>

        {/* Holdings table */}
        {holdings.length > 0 && (
          <section className="mt-8">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Positions
              </p>
              <h2 className="mt-1 text-xl font-semibold">Your holdings</h2>
            </div>
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border bg-secondary/30 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Symbol", "Quantity", "Avg. buy price", "Current price", "P&L", "Change"].map(
                      (h) => (
                        <th key={h} className="px-5 py-3 font-medium">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {holdings.map((item) => {
                    const pnl = item.profit;
                    const pct = item.profitPercentage;
                    return (
                      <tr key={item.symbol} className="hover:bg-accent/30">
                        <td className="px-5 py-4 font-bold">{item.symbol}</td>
                        <td className="px-5 tabular-nums">{item.quantity}</td>
                        <td className="px-5 tabular-nums">${item.averageCost.toFixed(2)}</td>
                        <td className="px-5 tabular-nums">${item.currentPrice.toFixed(2)}</td>
                        <td
                          className={`px-5 font-semibold tabular-nums ${pnl >= 0 ? "text-profit" : "text-loss"}`}
                        >
                          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                        </td>
                        <td
                          className={`px-5 font-semibold ${pct >= 0 ? "text-profit" : "text-loss"}`}
                        >
                          {pct >= 0 ? "+" : ""}
                          {pct.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Analytics */}
        {holdings.length > 0 && (
          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="panel p-5">
              <h2 className="font-semibold">Portfolio allocation</h2>
              <p className="mt-1 text-xs text-muted-foreground">By current market value</p>
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={allocation}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={4}
                    >
                      {allocation.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {allocation.map((item) => (
                  <span
                    key={item.name}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <i className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Transaction history */}
        <section className="mt-8 pb-12">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Activity
              </p>
              <h2 className="mt-1 text-xl font-semibold">Transaction history</h2>
            </div>
            <div className="flex gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="BUY">Buy</SelectItem>
                  <SelectItem value="SELL">Sell</SelectItem>
                </SelectContent>
              </Select>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All stocks</SelectItem>
                  {uniqueSymbols.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="panel p-8 text-center text-sm text-muted-foreground">
              No transactions yet. Start trading to see your history here!
            </div>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border bg-secondary/30 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 font-medium">Type</th>
                    <th className="px-5 font-medium">Symbol</th>
                    <th className="px-5 font-medium">Quantity</th>
                    <th className="px-5 font-medium">
                      <button
                        onClick={() => setSortAsc(!sortAsc)}
                        className="inline-flex items-center gap-1"
                      >
                        Price <ArrowUpDown className="size-3" />
                      </button>
                    </th>
                    <th className="px-5 font-medium">Total value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((item) => (
                    <tr key={item._id}>
                      <td className="px-5 py-4 text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.type === "BUY" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"}`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="px-5 font-bold">{item.symbol}</td>
                      <td className="px-5">{item.quantity}</td>
                      <td className="px-5 tabular-nums">${item.price.toFixed(2)}</td>
                      <td className="px-5 font-semibold tabular-nums">
                        $
                        {(item.price * item.quantity).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  profit,
  caption,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  profit?: boolean;
  caption?: string;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${profit ? "rotate-180 text-profit" : "text-primary"}`} />
      </div>
      <p className={`mt-4 text-2xl font-bold tabular-nums ${profit ? "text-profit" : ""}`}>
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-profit">{caption}</p>}
    </div>
  );
}
