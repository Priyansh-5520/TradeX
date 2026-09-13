import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";

export function TradeXLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5" aria-label="TradeX home">
      <span className="grid size-9 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary shadow-[0_0_24px_var(--glow)] transition-all duration-300 group-hover:border-primary/60">
        <Activity className="size-5" />
      </span>
      {!compact && <span className="font-display text-xl font-bold text-foreground">Trade<span className="text-primary">X</span></span>}
    </Link>
  );
}