# Exchange front end and provider API

This repository currently contains the React/Vite exchange UI and a small Node.js API boundary for a licensed betting provider. It does **not** include a production provider or payment integration. Until one is configured, the odds visible in the UI are preview fixtures and login, live markets, real deposits, withdrawals, and bet placement are unavailable.

## Run locally

Use two terminals from this directory:

```powershell
npm run dev:api
npm run dev
```

Open `http://localhost:5173/`. Vite proxies `/api` requests to the API on `127.0.0.1:3001`.

## Operator dashboard

The `/admin` dashboard uses separate operator accounts and roles (`admin`, `operator`, `support`, `auditor`) stored in PostgreSQL. Customer/provider credentials do not grant operator access. Configure `DATABASE_URL`, apply the schema, and bootstrap the first administrator:

```powershell
$env:DATABASE_URL = 'postgresql://exchange_user:your-local-password@localhost:5432/exchange'
npm run db:migrate
$env:ADMIN_EMAIL = 'admin@example.test'
$env:ADMIN_FULL_NAME = 'Exchange Administrator'
$env:ADMIN_PASSWORD = 'use-a-unique-password-of-at-least-14-characters'
npm run admin:create
```

`admin:create` creates only the first active administrator and refuses to seed another. Passwords are hashed with Node.js scrypt. Admin sessions use opaque, hashed database tokens in an `HttpOnly`, `SameSite=Lax` cookie, expire after eight hours, and write sign-in/sign-out events to the audit table. Admin APIs return HTTP `503` until PostgreSQL is configured and the migration is applied.

The dashboard is currently read-only: it shows real operator-account counts and sign-in audit activity, plus integration readiness. Customer management, operator provisioning, market control, and settlement remain unavailable until their authorization rules and provider interfaces are defined.

## Wallet and wagering foundation

Migration `002_wallet_ledger.sql` adds the PostgreSQL foundation for customer wallets, immutable ledger entries, payment transactions, and wager reservations. `server/wallet-ledger.mjs` provides atomic server-side operations for credited deposits, withdrawal requests, and reserved wager funds. These functions are intentionally not exposed as public routes yet: a payment processor and licensed betting provider must be selected before any endpoint can move real money or accept a wager.

All amounts are stored as integer minor units (for example, cents or paise). A production payment adapter must verify signed webhooks, enforce provider idempotency, reconcile provider transactions, and only credit deposits after confirmed settlement. A production betting adapter must reserve funds before placement, confirm the current odds and limits server-side, finalize the wager only after provider acceptance, and release or settle held funds from trusted provider settlement events.

Customer login audit events

When the API is running, provider and demo logins record the server-observed client IP address, username, account type, user-agent, and timestamp. If PostgreSQL is configured and the migration is applied, these events are stored in `customer_login_events`; otherwise the API writes a server-side log entry. IP addresses are never returned to the browser. Only set `TRUST_PROXY=true` when the API is behind a proxy that you control and that overwrites `X-Forwarded-For`.

In PowerShell, configure the module before starting the API:

```powershell
$env:BETTING_PROVIDER_MODULE = 'server/providers/acme.mjs'
npm run dev:api
```

The API exposes:

- `GET /api/health` — API and provider configuration status
- `GET /api/markets?sport=Cricket` — provider markets
- `POST /api/auth/login` and `POST /api/auth/logout` — provider authentication
- `GET /api/auth/session` — current server-side session user
- `GET /api/account` — provider account details
- `GET /api/bets` and `POST /api/bets` — provider bet history and bet placement
- `POST /api/admin/login`, `POST /api/admin/logout`, and `GET /api/admin/session` — separate operator session
- `GET /api/admin/overview` — role-filtered operator counts and audit activity

Without a configured provider, provider-dependent routes return HTTP `503`; they never accept a locally simulated bet.

## Provider adapter

Choose a licensed provider, obtain its sandbox/API documentation, and implement an ES module under `server/providers/`. Configure `BETTING_PROVIDER_MODULE` to its path relative to the project root, for example `server/providers/acme.mjs`. Keep API credentials in environment variables consumed by the adapter; never put them in Vite variables or commit them.

`server/providers/` contains:

- `http.mjs` — shared helpers for adapters: `providerFetch` (timeout + JSON + bearer auth), `ProviderError`, and `providerHttpError`, which maps provider HTTP failures onto the API's error contract. Adapter errors carrying a `status` in the `400`–`499`/`401`/`403`/`409` range surface to the browser; anything else becomes a `502` so raw provider payloads never leak.
- `template.mjs` — a commented starting point for a real adapter. Copy it, implement each method against the provider's API, and point `BETTING_PROVIDER_MODULE` at your copy.
- `mock.mjs` — a **development-only** in-memory provider. It lets you exercise the full login, market, account, bet history, and bet placement flow before a licensed adapter exists. It is not a betting provider: balances reset on restarts, there is no settlement, and no real money moves. Never deploy it.

Markets are keyed by a composite selection identifier of the form `${eventId}:${selectionId}`, because the browser bet slip submits a single `selectionId` string. Use `splitSelectionId()` to decode it.

Run the mock provider locally:

```powershell
$env:BETTING_PROVIDER_MODULE = 'server/providers/mock.mjs'
npm run dev:api
```

The mock provider seeds two accounts — `demo` / `demo1234` and `test` / `test1234` — each with a starting balance of `10000`.

The module must export a default object with:

```js
export default {
  name: 'Provider display name',
  async authenticate({ username, password }) {
    // Return null when the provider rejects the credentials.
    return {
      sessionToken: 'provider-issued-token',
      user: { id: 'provider-user-id', username, fullName: 'Public name' },
    }
  },
  async logout({ sessionToken }) {},
  async getMarkets({ sport }) {
    return []
  },
  async getAccount({ sessionToken }) {
    return { balance: 0 }
  },
  async getBets({ sessionToken }) {
    return [] // Map provider records to { id, event, market, selection, odds, stake, status, date }.
  },
  async placeBet({ sessionToken, idempotencyKey, bet }) {
    return { id: 'provider-bet-id', ...bet }
  },
}
```

Implement each method according to the provider's documented API, error semantics, market identifiers, odds and selection schema. Provider calls run on the server; credentials and provider session tokens are not sent to the browser. The API keeps its customer session-cookie-to-provider-token mapping in memory, so customer sessions expire on API restart. This is a development integration boundary, not production-ready identity, payment, wallet, or wagering infrastructure.

`POST /api/bets` requires an `Idempotency-Key` header and passes it to the adapter. The adapter must enforce provider-side idempotency, confirm the current market/selection and price instead of trusting submitted odds, and enforce account funds, limits, and provider rules before returning an accepted bet. Map bet history to `{ id, event, market, selection, odds, stake, status, date }`. If your adapter needs to reject a request with a specific HTTP status, throw `ProviderError(message, { status, code })` from `http.mjs` — the `status` is passed through and `code` becomes the API error code.

## Before production

Do not accept real-money wagers until the selected provider, jurisdiction, licensing, age/KYC/AML checks, responsible-gambling controls, payment flows, auditability, security review, and operational requirements have been implemented and approved. Use the provider's sandbox first. Deploy behind HTTPS, configure production cookie/security settings, and replace in-memory sessions with a durable, appropriately protected session store.

## Build and lint

```powershell
npm run build
npm run lint
npm run test:api
```
