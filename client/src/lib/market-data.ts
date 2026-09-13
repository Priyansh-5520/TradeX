export type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  high: number;
  low: number;
  volume: string;
  marketCap: string;
  range52: string;
  color: string;
  chart: number[];
};

export const defaultStock: Stock = { symbol: "AAPL", name: "Apple Inc.", price: 237.31, change: 1.86, high: 239.12, low: 232.47, volume: "54.2M", marketCap: "$3.59T", range52: "$164.08 — $260.10", color: "var(--chart-1)", chart: [225, 228, 226, 231, 230, 234, 232, 236, 235, 238, 237] };

export const stocks: Stock[] = [
  defaultStock,
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 141.97, change: 2.41, high: 143.44, low: 138.08, volume: "218.6M", marketCap: "$3.48T", range52: "$75.61 — $152.89", color: "var(--chart-2)", chart: [128, 131, 130, 135, 133, 137, 139, 136, 140, 139, 142] },
  { symbol: "TSLA", name: "Tesla, Inc.", price: 352.56, change: -1.18, high: 363.22, low: 348.15, volume: "82.4M", marketCap: "$1.13T", range52: "$138.80 — $488.54", color: "var(--chart-3)", chart: [367, 363, 365, 359, 361, 356, 358, 354, 357, 351, 353] },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 428.84, change: 0.72, high: 431.65, low: 424.11, volume: "19.8M", marketCap: "$3.19T", range52: "$344.77 — $468.35", color: "var(--chart-4)", chart: [417, 420, 419, 423, 421, 425, 426, 424, 427, 426, 429] },
  { symbol: "AMZN", name: "Amazon.com, Inc.", price: 214.10, change: 1.27, high: 216.38, low: 210.42, volume: "31.7M", marketCap: "$2.25T", range52: "$151.61 — $242.52", color: "var(--chart-5)", chart: [205, 207, 206, 209, 208, 211, 210, 213, 212, 215, 214] },
];

export const periods = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y"];

export function chartData(stock: Stock, period: string) {
  const scale = periods.indexOf(period) + 1;
  return stock.chart.map((price, index) => ({
    time: period === "1D" ? `${9 + Math.floor(index / 2)}:${index % 2 ? "30" : "00"}` : `P${index + 1}`,
    price: Number((price + Math.sin(index * 1.7) * scale * 0.42).toFixed(2)),
  }));
}

export const holdings = [
  { symbol: "AAPL", quantity: 18, avg: 198.42, current: 237.31 },
  { symbol: "NVDA", quantity: 32, avg: 112.80, current: 141.97 },
  { symbol: "MSFT", quantity: 10, avg: 445.20, current: 428.84 },
  { symbol: "AMZN", quantity: 14, avg: 189.30, current: 214.10 },
];

export const transactions = [
  { date: "Sep 12, 2026", type: "BUY", symbol: "NVDA", quantity: 8, price: 141.22 },
  { date: "Sep 10, 2026", type: "SELL", symbol: "TSLA", quantity: 4, price: 358.74 },
  { date: "Sep 08, 2026", type: "BUY", symbol: "AAPL", quantity: 5, price: 234.16 },
  { date: "Sep 03, 2026", type: "BUY", symbol: "AMZN", quantity: 6, price: 207.82 },
  { date: "Aug 28, 2026", type: "SELL", symbol: "MSFT", quantity: 3, price: 431.05 },
];

export const portfolioPerformance = [
  { label: "Apr", value: 38240 }, { label: "May", value: 40110 },
  { label: "Jun", value: 39480 }, { label: "Jul", value: 43250 },
  { label: "Aug", value: 45120 }, { label: "Sep", value: 47842 },
];