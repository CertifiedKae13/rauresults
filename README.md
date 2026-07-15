# StrideSync Live Results

A Flash Results-inspired live dashboard for server-authoritative Roblox AI track meets. It accepts signed result presentations from `AIMeetSystem`, stores them durably in D1, and refreshes the browser every 12 seconds.

## Architecture

```text
AIMeetSystem
  -> WebsiteResultsReporter (server-only queue + retry)
  -> POST /api/results (bearer authentication + validation + rate limit)
  -> D1 result_reports
  -> GET /api/results
  -> responsive event index, result table, and team standings
```

The ingest route is idempotent on `reportId`. Each body is capped at 128 KB, each presentation is capped at 64 rows, and each Roblox job can store at most 120 new reports per minute.

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

## Database

The D1 binding is `DB`. The runtime creates the table and indexes if necessary, while the generated Drizzle migration in `drizzle/` is included in hosted deployments.

After changing `db/schema.ts`, generate a new migration:

```bash
npm run db:generate
```

## Roblox installation

The complete server ModuleScript and exact `AIMeetSystem` hooks are in the generated `outputs` handoff folder. The reporter must remain in `ServerScriptService`. Configure both values from the private secrets handoff in Creator Hub Secret Store and enable **Allow HTTP Requests**.

No credential is shipped to a LocalScript, ReplicatedStorage, or the public browser bundle.
