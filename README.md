# Agent Token Hub

Agent Token Hub stores AI provider credentials, records usage from requests sent through its gateway, and offers routing, fallback, budget limits, and MCP tools for agent clients.

## Architecture

The app is a Vite-based TanStack Start application with three storage options:

- **Convex** for a hosted backend; set `APP_STORAGE=convex`.
- **Supabase/PostgreSQL** through Prisma; set `APP_STORAGE=supabase`.
- **Local storage** for demo use; set `APP_MODE=demo` and `APP_STORAGE=local`.

Convex is selected automatically when a Convex URL is configured and `APP_STORAGE` is unset. The server-side storage adapter talks to protected Convex functions; the browser must never receive `ATH_SERVICE_SECRET`.

## Setup

1. Copy `.env.example` to `.env` and set the app variables.
2. Generate a unique encryption key and service secret:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Use one generated value for `ENCRYPTION_KEY` and a separate random value for `ATH_SERVICE_SECRET`.
3. Set the same `ATH_SERVICE_SECRET` in the Convex deployment:

   ```bash
   npx convex env set ATH_SERVICE_SECRET "<same-secret-as-the-app>"
   ```

4. Install dependencies and start the app:

   ```bash
   bun install
   bun run dev
   ```

For production, configure `ATH_SERVICE_SECRET`, `ENCRYPTION_KEY`, and `AUTH_PASSWORD` in the app host, and configure `ATH_SERVICE_SECRET` in the matching Convex deployment. Do not use the same value for the encryption key and service secret.

## Usage data

Requests handled by `/api/v1/chat/completions` create per-request snapshots. Provider account usage checks are read-only because provider APIs generally return cumulative or windowed totals; adding those totals repeatedly would duplicate spend. Providers without a verified usage endpoint are reported as unsupported. Historical imports require explicit totals and are stored as one aggregate record, without an invented daily breakdown.

## Unified model gateway

The OpenAI-compatible API is available at `/api/v1`. `GET /api/v1/models` lists the enabled models configured on registered tokens. When the exact same upstream model ID is selected for tokens from at least two providers, the gateway also publishes a unified alias such as `ath/gpt-oss-120b`.

Gateway client keys can be created, activated, or deactivated from the dashboard's **Gateway API Keys** panel. A new key is shown once; only its SHA-256 hash is stored in Convex. Use the generated key as the client's Bearer token. Provider API keys remain separate and are used only for upstream requests.

The dashboard's **Uso por modelo** view combines gateway request snapshots for each unified model and breaks them down by provider. It shows requests, input/output tokens, registered tokens, active keys, and estimated cost. Convex currently returns the latest 300 snapshots per token, so the view flags models whose history may be incomplete. Provider model catalogs are not fetched live, and IDs with different spellings are not merged automatically.

Send that alias to `POST /api/v1/chat/completions` to route through the configured providers. The earliest eligible token is tried first; later matching providers are used after connection failures or retryable upstream responses (401, 404, 408, 429, or 5xx). Each provider receives its own exact model ID, and usage is recorded against the token that served the request. Provider-specific model IDs continue to route directly.

Unified aliases are built from each token's configured `selectedModels`; this version does not yet query provider model catalogs live. Model IDs must match exactly across providers to be grouped, so similar names are not silently treated as equivalent. Streaming fallback happens before the response stream begins.

## Scripts

```bash
bun run dev
bun run build
bun run start
bun run convex:dev
bun run convex:deploy
bun run convex:codegen
```
