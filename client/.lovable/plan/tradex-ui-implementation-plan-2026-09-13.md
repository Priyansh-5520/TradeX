# TradeX UI implementation plan

## Scope

Build a polished, dark-only stock trading simulator with realistic mock data. The app will be frontend-only and organized so live REST and WebSocket data can replace the mocks later.

## Pages

1. **Landing (`/`)**
  - Cinematic TradeX identity, animated market backdrop, headline, feature highlights, and a clear path "Get Started" to sign in. 
2. **Authentication (`/auth`)**
  - Sign-in/sign-up tabs, Google-style entry action, validated username field, and subtle animated geometry.
3. **Trading dashboard (`/dashboard`)**
  - Searchable market navigation, selected-stock metrics, period-switching area chart, clickable watchlist sparklines, and buy/sell ticket.
  - Quote locking with a real 10-second countdown, computed order total, validation, and success notifications.
  - Loading skeleton state for market panels.
4. **Profile (`/profile`)**
  - User details, cash/value/P&L summary, holdings, sortable and filterable transactions, allocation chart, and performance chart.

## Shared experience

- Responsive desktop trading terminal that reorganizes cleanly for phones.
- Semantic deep navy, charcoal, cyan, blue, green, and red design tokens with restrained glass surfaces.
- Outfit typography, consistent icon controls, accessible states, smooth motion, and reduced-motion support.
- Shared mock market data and reusable navigation/logo/chart patterns.
- Unique metadata for every page.

## Technical details

- Keep the project’s existing TanStack React router rather than adding a second router.
- Use Recharts for primary, sparkline, allocation, and portfolio performance visualizations.
- Use existing dialog, button, input, tabs, skeleton, table, select, avatar, tooltip, and toast components.
- Keep all mock data isolated from presentation logic so backend integration is a later adapter change.

## Validation

- Verify all four routes at desktop and mobile widths.
- Exercise stock switching, search, periods, auth tabs, order lock/countdown, order confirmation, table sorting, and filtering.
- Check runtime console output and visible layout for overflow or overlap.