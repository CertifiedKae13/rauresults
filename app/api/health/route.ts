import { NextResponse } from "next/server";
import { listReports } from "../../../lib/results-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const results = await listReports(1);
  return NextResponse.json(
    {
      ok: true,
      storage: results.demo ? "ready-empty" : "ready",
      lastResultAt: results.demo ? null : results.updatedAt,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
