# ADR-006: Deployment Strategy

**Date:** 2026-07 

---

## Context

TicketTower requires a deployment strategy covering three distinct concerns:

1. **Application hosting** — where the Next.js app runs
2. **Database hosting** — where the production Postgres instance runs
3. **AI inference** — what replaces Ollama in production

Additionally, a branching and deployment pipeline strategy is needed to support iterative development — deploying at the end of each epic rather than at the end of the project.

This is a solo portfolio project. Key constraints:
- Cost should be zero or near-zero for portfolio/demo scale traffic
- Setup complexity should be low — the goal is demonstrating the application, not DevOps skill
- The strategy should mirror professional engineering practices
- pgvector must be supported in the production database

---

## Decisions

### 1. Vercel for application hosting

**Chosen:** Vercel Hobby (free tier)

Vercel is the company that created Next.js. Their hosting platform has zero-configuration support for every Next.js feature — server components, server actions, edge functions, streaming responses. No Dockerfile, no server configuration, no deployment scripts are required.

Deployment is triggered automatically by pushing to GitHub. Every pull request receives a unique preview URL. Production deploys when code merges to `main`.

**Why not alternatives:**

| Option | Reason Not Chosen |
|--------|------------------|
| AWS EC2 | Requires server provisioning, OS management, manual Next.js setup — operational overhead not justified at this scale |
| Railway | Valid option, but limited free tier; Vercel's Next.js support is superior |
| Render | Free tier has cold start delays (30s spin-up); poor experience for a demo |
| Fly.io | Powerful but requires significant configuration for Next.js |
| Self-hosted VPS | Full infrastructure management responsibility; DBA work for Postgres; no benefit at this scale |

**On self-hosting Postgres on EC2:**
While Postgres runs on Linux and AWS EC2 is Linux-based, self-hosting requires: instance configuration, VPC and security group setup, SSL certificate management, automated backups, connection pooling, OS and Postgres security patching, and failover configuration. This is database administration work — a full discipline in itself. Managed services exist precisely to abstract this, allowing engineering focus to remain on the application.

---

### 2. Neon for production Postgres

**Chosen:** Neon (free tier — 0.5GB storage, scales to zero)

Neon is a managed serverless Postgres service. The connection string it provides works identically to the local Docker Postgres — only the `DATABASE_URL` environment variable changes between environments. Prisma migrations run against it without modification using `prisma migrate deploy`.

**Why Neon specifically:**
pgvector is enabled by default on Neon. This is the critical differentiator — most free managed Postgres services do not support extensions, and pgvector is a core requirement for TicketTower's semantic search features. Manual extension compilation on a self-hosted instance would be non-trivial.

**Why not alternatives:**

| Option | Reason Not Chosen |
|--------|------------------|
| AWS RDS | Not free; significant cost for a portfolio project |
| Supabase | Valid alternative; also supports pgvector on free tier. More opinionated platform (bundles auth, storage). Neon chosen for its simplicity and Prisma-first positioning |
| Railway Postgres | Limited free tier; does not support pgvector by default |
| PlanetScale | MySQL — not Postgres; no pgvector support |
| Self-hosted on EC2 | See above; operational overhead not justified |

**Cost:** Neon's free tier scales to zero when idle — there is no charge for a sleeping database. Storage for TicketTower's demo data is well within the 0.5GB limit (a ticket record is approximately 2KB; 250,000 tickets would be required to approach the limit).

---

### 3. OpenAI for production AI inference

**Chosen:** OpenAI (`gpt-4o-mini` for completions, `text-embedding-3-small` for embeddings)

Ollama runs on local hardware and is not accessible from Vercel's servers. Production requires a hosted LLM provider. The AI provider abstraction built in ADR-003 means switching is a single environment variable change — no code modifications.

OpenAI is chosen for production because:
- `gpt-4o-mini` is fast, capable, and cheap — appropriate for summarisation and response drafting
- `text-embedding-3-small` is among the cheapest embedding APIs available ($0.02 per million tokens)
- API reliability and uptime are well-established
- The Anthropic SDK is an equally valid alternative and can be switched via `AI_PROVIDER=anthropic`

**Cost control:** A hard monthly spending cap is set in the OpenAI dashboard (recommended: £5–10). This prevents any runaway cost regardless of traffic. For a portfolio project at demo scale, total AI inference cost is expected to be under £1 across the project lifetime.

**Development vs production split:**

| Environment | AI Provider | Cost |
|-------------|------------|------|
| Local (`npm run dev`) | Ollama | Free — runs on local hardware |
| Production (Vercel) | OpenAI | Per-token, capped at £5/month |

This split is managed entirely via environment variables — `AI_PROVIDER=ollama` locally, `AI_PROVIDER=openai` in Vercel's environment configuration.

#### Update (2026-11): Gemini free tier for the live demo

The live demo uses Google Gemini's free tier (`AI_PROVIDER=gemini`, default model `gemini-3.5-flash-lite`) instead of OpenAI, so the demo costs nothing to run. The API key comes from a Google AI Studio project with billing disabled. That project cannot be charged, and Google's own rate limits replace the spending cap, so the worst case is the AI pausing until the daily quota resets. OpenAI stays a supported option with no code changes.

- **Implementation:** Gemini exposes an OpenAI-compatible endpoint, so the `gemini` provider reuses the OpenAI provider with a different base URL. It sets `reasoning_effort: "low"` because Gemini 3 models always think, and thinking tokens count against `maxTokens`.
- **Reliability:** the free tier returns occasional `503` overload errors. `server/ai/http.ts` retries `429`/`5xx` responses with backoff (1s, 3s, 7s) before surfacing an error.
- **Data usage:** on the free tier, Google may use prompts and outputs to improve its models, and human reviewers may read them. That is acceptable for TicketTower's synthetic seed data, but it would rule the free tier out for real customer data, where a paid tier or a provider with no-training terms would be required. The provider abstraction exists for exactly this kind of switch.

---

### 4. Branch and deployment pipeline

**Chosen:** Two long-lived branches with feature branches per issue

```
main     → production (auto-deploys to Vercel on push)
dev      → staging (preview deployment on Vercel)
feature/ → per-issue working branches, created from dev, PR back to dev
```

**Flow:**
```
main
  └── dev
        └── feature/7-nextauth-setup
        └── feature/8-ticket-schema
        └── feature/9-ticket-inbox-ui
```

Work happens on `feature/*` branches. Each PR into `dev` gets an automatic Vercel preview URL. When an epic is complete and stable in `dev`, a PR from `dev` into `main` triggers a production deployment.

**Nothing merges directly into `main` except PRs from `dev`.** Main is always deployable.

**Why deploy at the end of each epic rather than at the end of the project:**
Deploying incrementally means infrastructure and environment problems surface when they are small and isolated — not compounded with all other problems at the end of the project. It also means the portfolio URL exists and is current throughout development, and production deployment becomes routine rather than a high-stakes event.

---

## Consequences

- `DATABASE_URL` must be set as a Vercel environment variable pointing to Neon before any deployment
- `AUTH_SECRET` must be generated (`openssl rand -base64 32`) and set in Vercel
- `AUTH_URL` is auto-detected on Vercel and does not need to be set explicitly
- `AI_PROVIDER=openai` and `OPENAI_API_KEY` must be set in Vercel before AI features are deployed
- A spending cap must be configured in the OpenAI dashboard before the API key is added to Vercel
- `package.json` build script must run `prisma migrate deploy` before `next build` to ensure schema migrations are applied on every deployment
- Ollama is a local development tool only — it has no role in the production architecture
- Neon's 0.5GB free tier is sufficient for demo/portfolio scale; migration to a paid tier would be required for real production use

---

## Environment Variable Map

| Variable | Local | Production |
|----------|-------|-----------|
| `DATABASE_URL` | Docker Postgres (`localhost:5432`) | Neon connection string |
| `AI_PROVIDER` | `ollama` | `gemini` (free tier) or `openai` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Not set |
| `OPENAI_API_KEY` | Not set | Set in Vercel if `AI_PROVIDER=openai` |
| `GEMINI_API_KEY` | Optional (for testing Gemini locally) | Set in Vercel if `AI_PROVIDER=gemini` |
| `AUTH_SECRET` | Any random string | `openssl rand -base64 32` |
| `AUTH_URL` | Not set (auto-detected) | Not set (auto-detected on Vercel) |