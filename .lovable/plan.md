# App Audit — Let's Stream Tracker

I reviewed your edge functions, hooks, components, database, PWA config, and dependencies. Below is a prioritized list of findings, then a recommended fix order, then what a more complete audit would additionally include.

## Critical (fix before more production traffic)

**C1. Brevo API keys stored in plain text in `app_settings`**
Every user's `xkeysib-...` key sits in a regular table column. Any future RLS bug or admin-side leak exposes live keys for every customer. Fix: store keys in Supabase Vault, or at minimum encrypt at the app layer with a server-side key.

**C2. `verify_jwt = false` on all three email edge functions** (`supabase/config.toml`)
You re-check the JWT manually inside the function, which works today — but one bad future edit makes the endpoint fully public. Set `verify_jwt = true` for `send-single-email` and `send-mass-email`. For `send-expiry-reminders` (cron-callable), keep it false but split the cron path behind a shared-secret header check.

**C3. `LOVABLE_API_KEY` read but never validated in `send-expiry-reminders`** (line ~315)
The function throws if the env var is missing but never compares it to a request header — so it provides zero protection. Either validate `x-lovable-api-key` against it, or remove the dead check.

## High

- **H1.** `useCustomers.ts:99` — auto-expire `Promise.all(...).then(...)` has no `.catch`; failures silently leave stale UI.
- **H2.** `vite.config.ts` — `skipWaiting + clientsClaim` plus a 24h `NetworkFirst` cache on `*.supabase.co` can serve stale auth/data after a deploy. Drop Supabase cache to ≤5 min, or `NetworkOnly` for `/auth/v1/*`.
- **H3.** `CustomerTable.tsx` bulk delete uses a raw `supabase` call with no loading guard — rapid clicks fire duplicate deletes.
- **H4.** `EmailProviderSettingsDialog.tsx` uses `as any` because `src/integrations/supabase/types.ts` is stale (missing `brevo_*` columns). Regenerate types.
- **H5.** Wrong-vendor comment in `send-mass-email/index.ts:353` ("Resend allows 10/s") — misleading; you're on Brevo (300/day on free).

## Medium

- **M1.** `useAuth.ts` double state-set on mount (minor flicker).
- **M2.** No `staleTime` on any `useQuery` → refetch storm on every mount. Set 30s on `useCustomers`/`useAppSettings`.
- **M3.** `ImportCustomersDialog` per-row errors only `console.error`'d — user sees "X failed" with no reason.
- **M4.** `MassEmailDialog` filter toggles read stale closure state; rapid chip clicks can miss combinations.
- **M5.** `useAuth.signOut` swallows errors silently.
- **M6.** `replyToEmail` saved with no email-format validation (client or edge).
- **M7.** Logo signed URLs expire in 7 days — if you add `staleTime`, cap below 7d.
- **M8.** `send-mass-email` allows 1000 recipients × 100ms = ~100s, near the 150s edge function timeout. Chunk or move to a job queue.

## Low

- **L1/L2.** `console.log`/`console.error` shipped to production (`usePWA.ts`, `CustomerTable.tsx`). Gate behind `import.meta.env.DEV`.
- **L3.** Hardcoded `app_name: 'My App'` fallback in `EmailProviderSettingsDialog`.
- **L4.** Explicit `storage: localStorage` in Supabase client disables the automatic in-memory fallback for privacy browsers.
- **L5.** Google Fonts loaded from CDN — self-host via `@fontsource/*` for privacy + perf.
- **L6/L7.** `lucide-react` ~8 versions behind; `react-day-picker` v8 with v9 breaking change upcoming.
- **L8.** Dead `./pages/**` / `./components/**` globs in `tailwind.config.ts`.

## Recommended fix order (3 short passes)

1. **Security pass** — C1 (Vault for API keys), C2 (`verify_jwt`), C3 (drop dead check), H4 (regen types), L4 (storage fallback).
2. **Stability pass** — H1 (catch), H2 (PWA cache), H3 (bulk-delete guard), M2 (staleTime), M5 (signOut errors), M8 (mass-email chunking).
3. **Polish pass** — M3/M4/M6, H5, all Low items.

I'd tackle pass 1 in its own change so the security fixes are easy to review.

## What else a complete audit should include

The items above are what I can see from the code. A full audit usually adds:

- **Penetration / RLS testing** — actually try cross-tenant reads with a second test account (curl with another user's JWT against every table and edge function).
- **Backup & disaster recovery** — confirm Supabase point-in-time-recovery is enabled, document a restore drill.
- **Email deliverability** — SPF, DKIM, DMARC records on `letsstreamtracker.ca`, sender reputation, bounce/complaint handling.
- **Legal / compliance** — Privacy Policy, Terms, cookie banner if EU traffic, GDPR data-export & delete flows, PIPEDA (Canada) for customer data.
- **Accessibility (a11y)** — keyboard navigation of the customer table, focus traps in dialogs, ARIA labels, color contrast in light/dark.
- **Performance** — Lighthouse run on mobile, LCP/CLS/INP budgets, bundle-size analysis (`vite build --report`), image optimization on user-uploaded logos.
- **SEO** — meta tags, sitemap, robots.txt, Open Graph (less relevant for an auth-walled app, but the marketing/landing surfaces matter).
- **Observability** — error tracking (Sentry), uptime monitoring, alerting on edge-function 5xx rates and Brevo bounce webhooks.
- **Cost monitoring** — Supabase egress, edge invocation count, Brevo per-user usage caps so a single user can't drain your plan.
- **Account lifecycle** — account deletion (purge customers + storage + reminder_history), data export (GDPR right to portability), session timeout policy.
- **Subscription / billing logic** — if you plan to charge users, no payments layer exists yet.

---

Approve this plan to switch to build mode; I'll then apply the fixes pass-by-pass (I'd recommend starting with the Security pass only so each batch is reviewable). Or tell me which specific items you want me to skip or prioritize differently.