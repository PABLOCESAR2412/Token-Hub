# Agent Token Hub

App for centralizing AI agent tokens/APIs, with quota tracking, cost, and analytics.

## Architecture

Single vite-based TanStack Start app. Uses environment variables to adapt behavior:

1. **Demo Mode:** Pure SPA using Vite + localStorage (no backend).
2. **Production Mode:** Full-stack TanStack Start with server functions + PostgreSQL (Prisma).

## Environment Variables

Copy `.env.example` to `.env`:
- `APP_MODE`: `demo` or `production`
- `APP_STORAGE`: `local` or `supabase`

## Development

```bash
bun run dev
```

## Build & Deploy

```bash
bun run build
bun run start
```
