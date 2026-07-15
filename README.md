# StrideSync Live Results

A Flash Results-inspired live dashboard for server-authoritative Roblox AI track meets. It accepts signed live snapshots and completed result presentations from `AIMeetSystem`, keeps the active race hot at four updates per second, and stores completed results durably in D1.

## Architecture

```text
AIMeetSystem
  -> WebsiteResultsReporter (server-only queue + retry)
  -> POST /api/live (0.25-second active-race snapshots)
  -> POST /api/results (bearer authentication + validation + rate limit)
  -> hot live snapshot + D1 result_reports
  -> GET /api/live and GET /api/results
  -> live race board, event index, result table, and team standings
```

The ingest route is idempotent on `reportId`. It accepts the ingest credential in `X-Results-Token` (or standard bearer authorization on hosts without an authentication gateway). Each body is capped at 128 KB, each presentation is capped at 64 rows, and each Roblox job can store at most 120 new reports per minute.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Empty storage intentionally shows a labeled preview feed. The development ingest token is `local-development-token`.

## Validation

```bash
npm run lint
npm test
```

`npm test` builds the production bundle, starts an isolated local runtime, checks the rendered dashboard, verifies the demo API response, and verifies that unsigned ingest requests are rejected.

## Free Cloudflare Pages address

The project can be published as `https://rauresults.pages.dev` on a free
Cloudflare account. This project is a full server-rendered dashboard: its
`/api/live` and `/api/results` endpoints, D1 database, and private
`RESULTS_INGEST_TOKEN` must all be configured in the Pages project.

1. Push this project to GitHub, then create a **Pages** project named
   `rauresults` in Cloudflare from that repository. Set the build command to
   `npm run build:pages` and the output directory to `dist/client`. The
   prepared `_worker.js` keeps the dashboard API running alongside the site
   assets.
2. In **Settings → Bindings**, create a D1 binding named `DB` and select a new
   D1 database. In **Settings → Variables and Secrets**, add
   `RESULTS_INGEST_TOKEN` as a secret.
3. Redeploy, then set the Roblox reporter URL to
   `https://rauresults.pages.dev/api/live` and
   `https://rauresults.pages.dev/api/results`.

## Database

The D1 binding is `DB`. The runtime creates the table and indexes if necessary, while the generated Drizzle migration in `drizzle/` is included in hosted deployments.

After changing `db/schema.ts`, generate a new migration:

```bash
npm run db:generate
```

## Roblox installation

The complete server ModuleScript and exact `AIMeetSystem` hooks are in the generated `outputs` handoff folder. The reporter must remain in `ServerScriptService`. Configure both values from the private secrets handoff in Creator Hub Secret Store and enable **Allow HTTP Requests**.

No credential is shipped to a LocalScript, ReplicatedStorage, or the public browser bundle.
