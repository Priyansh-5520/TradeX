import { Link } from "@tanstack/react-router";
import { ChevronDown, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { TradeXLogo } from "@/components/tradex-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { stockApi, type SearchResult } from "@/lib/api";

export function AppHeader({ onSelect }: { onSelect?: (symbol: string) => void }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const initials = user?.userName?.slice(0, 2).toUpperCase() ?? "??";

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await stockApi.search(q);
      setResults(res.data.slice(0, 8));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    // Debounce-like: only search after 2+ chars
    if (value.length >= 2) {
      doSearch(value);
    } else {
      setResults([]);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <TradeXLogo />
        <div className="relative mx-auto hidden w-full max-w-xl sm:block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => handleChange(event.target.value)}
            placeholder="Search stocks by name or symbol"
            className="h-10 border-border/80 bg-card/70 pl-10"
            aria-label="Search stocks"
          />
          {results.length > 0 && (
            <div className="absolute top-12 z-50 w-full overflow-hidden rounded-md border border-border bg-popover shadow-2xl">
              {results.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => {
                    onSelect?.(stock.symbol);
                    setQuery("");
                    setResults([]);
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <span>
                    <b className="text-sm">{stock.symbol}</b>
                    <span className="ml-3 text-xs text-muted-foreground">{stock.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{stock.exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button asChild variant="ghost" className="h-11 gap-2 px-2">
          <Link to="/profile">
            <Avatar className="size-8 border border-primary/30">
              <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">{initials}</AvatarFallback>
            </Avatar>
            <ChevronDown className="size-3 text-muted-foreground" />
            <span className="sr-only">Open profile</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}