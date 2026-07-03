## Goal

Use the SmartReach AI Master Document (v5.0, April 2026) as the source of truth. Audit what's built vs. what the doc promises, update the public landing page to match the doc's positioning and pricing, and persist the canonical facts to project memory so every future turn stays on-brand.

## 1. Gap audit (delivered as a short report in chat)

Compare doc modules to shipped surfaces:

| Doc pillar | Status |
|---|---|
| Unified inbox, social, live streaming, marketing suite, wellness, wallet/M-Pesa, talent hub, CRM, inventory, competitors, VoC, Geo-Intel, bundling, health score, agentic AI, help center, analytics | already built (per memory index) |
| Sokoni/Anza/Kua/Fanikisha/Enterprise 5-tier pricing | landing shows only 3 tiers with wrong names/prices — **fix** |
| SmartReach Capital (revenue-based financing via SmartReach Score) | not built — flag as Phase 5 roadmap |
| SACCO integration (14k+ SACCOs, 5M members) | not built — flag as roadmap |
| Voice commerce, AR product visualization, multi-currency pan-African | not built — flag as Series A/B roadmap |
| Offline-first PWA | verify service worker; flag if missing |
| ODPC compliance & security posture | already hardened (per memory) |

Deliver as a compact table in the response, no separate file.

## 2. Landing page refresh (`src/pages/Index.tsx`)

- Replace `pricingPlans` with the doc's five tiers:
  - **Sokoni** — KES 0 — Micro-entrepreneurs — 1 channel, 5 AI credits, basic analytics, community
  - **Anza** — KES 1,699/mo — 1–3 person — 2 channels, unified inbox, 50 AI posts, M-Pesa payment links
  - **Kua** — KES 3,499/mo — 4–10 person — 5 channels, 200 AI posts, M-Pesa automation, 5-user collab (**highlighted / most popular**)
  - **Fanikisha** — KES 6,999/mo — 10–50 person — unlimited channels, Agentic AI, dedicated AM, 4hr SLA
  - **Enterprise** — KES 15,000+/mo — Agencies & Corporates — custom infra, custom AI training, white-label
- Update tier grid to render 5 cards (responsive: 1 col mobile, 2 md, 5 lg) with the Kua card visually promoted.
- Add a short line under the pricing header referencing usage-based add-ons: "M-Pesa facilitation 0.5–1.5% GMV · Talent commissions 5–15% · AI credit packs KES 500 / 100 posts".
- Tighten the hero sub-copy to the doc's positioning: "Africa's first SME Growth Operating System — AI, M-Pesa, social commerce, talent, and embedded finance in one culturally-intelligent platform."
- Keep existing design tokens, animations, and structure — no visual overhaul.

## 3. Project memory updates

Save canonical facts so future sessions apply them automatically:

- **New file `mem://project/pricing-tiers`** — the 5-tier structure, transactional rates, add-on pricing. Type: `feature`.
- **New file `mem://project/positioning`** — tagline, TAM (20M+ East African SMEs), founding team names + roles, contact (`smartreachai.co.ke`, `alvo4breezy@gmail.com`, `+254 720 117 438`), version tag (v5.0 April 2026). Type: `reference`.
- **New file `mem://project/roadmap`** — what's in Seed vs. Series A vs. Series B (SmartReach Capital, SACCO integration, voice commerce, AR, pan-African multi-currency, live commerce). Type: `feature`.
- **Update `mem://index.md`** — add the three new entries under Memories; add one Core line: "Pricing tiers are Sokoni / Anza / Kua / Fanikisha / Enterprise — never invent new names or prices."

## 4. Out of scope this turn

- No new features (SmartReach Capital, SACCO portal, voice commerce) — those need their own scoped plans.
- No design-system overhaul.
- No backend / migration changes.
- No republishing — user triggers publish when ready.

## Verification

- Read `src/pages/Index.tsx` post-edit to confirm 5 tiers render.
- Confirm memory files exist and index references them.
- Build check runs automatically.
