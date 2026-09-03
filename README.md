# SettleIQ

**Agentic Payment Operations & Reconciliation for Razorpay Merchants**

SettleIQ is a production-oriented fintech platform that helps merchants reconcile Razorpay payments, investigate anomalies, and resolve payment operations cases — with full AI agent audit trails and human-in-the-loop approvals.

Built for the Razorpay Buildathon.

---

## Architecture

```
apps/web          → Next.js 16 app (UI + API routes)
packages/db       → Prisma schema + PostgreSQL client
packages/shared   → Shared types and Zod schemas
packages/agents   → Agent orchestrator and specialist agents
packages/razorpay → Typed Razorpay API client wrapper
packages/reconciliation → Deterministic matching rules engine
```

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 10
- **PostgreSQL** database (local, [Neon](https://neon.tech), or Supabase)

## Quick Start

### 1. Clone and install

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

Other variables (Clerk, Razorpay, OpenAI) are required in later phases but not needed to run the UI locally.

### 3. Set up the database

```bash
pnpm db:generate
pnpm db:push
```

### 4. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Run ESLint across the monorepo |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Prisma Studio |

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 0** | ✅ Complete | Monorepo, schema, UI foundation |
| Phase 1 | Pending | Razorpay API integration & data sync |
| Phase 2 | Pending | Reconciliation engine & case management |
| Phase 3 | Pending | AI agents & explainability |
| Phase 4 | Pending | Resolution & approval flows |
| Phase 5 | Pending | Demo hardening & deployment |

## Database Schema

Core entities:

- `organizations` — merchant accounts
- `payments`, `orders`, `settlements` — synced Razorpay data
- `cases` — reconciliation anomalies
- `agent_runs`, `agent_steps`, `tool_invocations` — AI audit trail

## Security Notes

- Never commit `.env` files
- Razorpay secrets are stored encrypted (Phase 1)
- Webhook signatures are verified before processing (Phase 1)
- High-impact actions require explicit human approval (Phase 4)

## License

Private — Razorpay Buildathon submission.
