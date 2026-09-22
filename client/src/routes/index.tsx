import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Radio, ShieldCheck, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { TradeXLogo } from "@/components/tradex-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "TradeX — Master the Market. Zero Risk." },
    { name: "description", content: "Practice stock trading with real-time market simulation and portfolio analytics." },
    { property: "og:title", content: "TradeX — Master the Market. Zero Risk." },
    { property: "og:description", content: "A premium stock trading simulator built for confident decisions." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: LandingPage,
});

const features = [
  { icon: Radio, title: "Real-Time Data", text: "Track market momentum with live-style price movement and rich security data." },
  { icon: ShieldCheck, title: "Paper Trading", text: "Test every strategy with virtual capital before you put real money at risk." },
  { icon: BarChart3, title: "Portfolio Analytics", text: "Understand performance, allocation, and profit through a sharper lens." },
];

function LandingPage() {
  return <main className="landing relative min-h-screen overflow-hidden bg-background">
    <div className="market-grid absolute inset-0" /><div className="market-beam absolute inset-x-0 top-[42%] h-px" />
    <nav className="relative z-20 mx-auto flex h-20 max-w-7xl items-center px-5 sm:px-8">
      <TradeXLogo />
      <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 text-xs text-muted-foreground/80 sm:flex">
        <span>AAPL <b className="text-profit">+1.86%</b></span>
        <span>NVDA <b className="text-profit">+2.41%</b></span>
        <span>TSLA <b className="text-loss">−1.18%</b></span>
        <span>BTC/USD <b className="text-profit">+3.02%</b></span>
      </div>
    </nav>
    <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col justify-center px-5 pb-12 pt-20 sm:px-8 sm:pb-20">
      <div className="mx-auto max-w-4xl text-center"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary"><Sparkles className="size-3.5" />The market is your classroom</div><h1 className="font-display text-6xl font-extrabold leading-none text-foreground sm:text-8xl lg:text-9xl">Trade<span className="glow-text">X</span></h1><p className="mt-6 text-2xl font-semibold sm:text-4xl">Master the Market. <span className="text-primary">Zero Risk.</span></p><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">Build instincts, test strategies, and learn to trade in a realistic market environment—without risking a dollar.</p><Button asChild size="lg" className="glow-button mt-9 h-13 px-7 text-base"><Link to="/auth">Get Started <ArrowRight /></Link></Button></div>
      <div className="mt-16 grid gap-3 md:grid-cols-3">{features.map(({ icon: Icon, title, text }, index) => <article key={title} className="glass-panel group p-5 transition-transform duration-300 hover:-translate-y-1"><div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary"><Icon className="size-5" /></span><div><div className="flex items-center justify-between"><h2 className="font-semibold">{title}</h2>{index === 0 && <TrendingUp className="size-4 text-profit" />}{index === 1 && <TrendingDown className="size-4 text-loss" />}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div></div></article>)}</div>
    </section>
  </main>;
}