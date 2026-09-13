# Prospect Assist AI — Next.js Frontend

Modern Next.js (App Router, TypeScript, Tailwind v4) frontend for the **IDBI Innovate 2026 · Track 02** prototype: a Behavioral Credit & Hyper-Targeted Lead Engine.

## Highlights

- **IDBI Bank brand system** — Orange Passion `#F58220` + Observatory Green `#00836C`, recreated SVG logo mark, brand gradient account card.
- **Light & dark themes** — one-click toggle, respects `prefers-color-scheme`, persisted in `localStorage`, zero-flash boot script. Chart colors are separately tuned and validated per mode for contrast and color-vision safety.
- **Split-screen demo stage** — left: a simulated *IDBI Go Mobile+* customer app (product browsing, working EMI calculator, behavior triggers); right: the Relationship Manager Hub (KPI tiles, campaign-lift A/B dashboard, prioritized lead board with LRI threshold slider, Behavioral Twin portfolio with radar fingerprint, AI outreach modal).
- **Live event stream** — every simulated behavior is journaled so judges can follow the pipeline reacting in real time.
- **RM authentication** — branded sign-in page at `/login` gating the hub, with a session chip + logout in the header. Demo access: `rm.demo@idbibank.in` / `idbi@2026` (one-click autofill for judges). Client-side by design for the static demo; swaps for IDBI SSO against the bank sandbox.
- **Dual data engine** — talks to the FastAPI sandbox (`http://localhost:8000/api`) when available and transparently falls back to a full **in-browser Standalone Engine** (same five-model math: income estimation, GBDT intent, risk gate, blended conversion, historical propensity + the multiplicative LRI). This makes the static export runnable on GitHub Pages with zero infrastructure.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000 (pairs with backend on :8000 if running)
```

## Build / static export

```bash
npm run build      # emits a fully static site in ./out
```

Deploy `out/` anywhere (GitHub Pages, S3, Netlify). For project-page hosting set a base path:

```bash
NEXT_PUBLIC_BASE_PATH=/Alpha-Fin npm run build
```

Point at a different backend with `NEXT_PUBLIC_API_BASE=https://host/api`.

## Structure

```
src/
├── app/                 # layout (theme boot, fonts, metadata) + page
├── lib/
│   ├── engine.ts        # standalone decision-intelligence engine (Models 1–5 + LRI)
│   ├── api.ts           # live-API client with automatic standalone fallback
│   ├── types.ts         # shared domain types
│   └── format.ts        # INR / percentage formatting helpers
└── components/
    ├── Dashboard.tsx    # orchestrator: polling, state, simulator actions
    ├── PhoneSimulator   # customer portal (products, EMI calculator, triggers)
    ├── LeadsBoard       # prioritized leads + LRI threshold slider
    ├── CampaignLift     # treated-vs-control conversion lift (emphasis form)
    ├── TwinPortfolio    # behavioral twin radar + component meters + narrative
    ├── OutreachModal    # channel tabs, decision checklist, convert/reject
    └── charts/          # Meter, TwinRadar (validated brand palette)
```
