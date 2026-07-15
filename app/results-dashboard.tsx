"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ResultRow, ResultsResponse } from "../lib/result-types";
import { LiveRaceBoard } from "./live-race-board";

const EVENT_ORDER = ["100M", "110H", "200M", "300M", "400M", "400H"];

function eventLabel(event: string): string {
  const labels: Record<string, string> = {
    "100M": "100 Meter Dash",
    "110H": "110 Meter Hurdles",
    "200M": "200 Meter Dash",
    "300M": "300 Meter Dash",
    "400M": "400 Meter Dash",
    "400H": "400 Meter Hurdles",
  };
  return labels[event] ?? event;
}

function readableTime(value?: string): string {
  if (!value) return "Waiting for results";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Recently"
    : parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

const TEAM_LOGOS: Record<string, string> = {
  UF: "/team-logos/florida.svg",
  UT: "/team-logos/texas.svg",
  USC: "/team-logos/usc.svg",
  LSU: "/team-logos/lsu.svg",
  UO: "/team-logos/oregon.svg",
  UGA: "/team-logos/georgia.svg",
};

function TeamLogo({ row, standings = false }: { row: ResultRow; standings?: boolean }) {
  const logo = TEAM_LOGOS[row.teamAbbr.toUpperCase()];

  if (!logo) {
    return <span className="team-logo-fallback" style={{ "--team-color": row.teamColor } as React.CSSProperties}>{row.teamAbbr.slice(0, 3)}</span>;
  }

  return (
    <span className={`team-logo${standings ? " team-logo-standings" : ""}`} title={row.team}>
      <Image src={logo} alt={`${row.team} logo`} width={standings ? 48 : 44} height={standings ? 48 : 38} />
    </span>
  );
}

export function ResultsDashboard() {
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadResults = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch("/api/results?limit=60", { cache: "no-store" });
      if (!response.ok) throw new Error(`Results request failed (${response.status})`);
      const next = (await response.json()) as ResultsResponse;
      setData(next);
      setError("");
      setSelectedReportId((current) => {
        const raceReports = next.reports.filter((report) => report.kind === "RaceResults");
        return raceReports.some((report) => report.reportId === current)
          ? current
          : (raceReports[0]?.reportId ?? "");
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load results");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialRequest = window.setTimeout(() => void loadResults(), 0);
    const interval = window.setInterval(() => void loadResults(), 12_000);
    return () => {
      window.clearTimeout(initialRequest);
      window.clearInterval(interval);
    };
  }, [loadResults]);

  const raceReports = useMemo(
    () => data?.reports.filter((report) => report.kind === "RaceResults") ?? [],
    [data],
  );
  const events = useMemo(() => {
    const present = new Set(raceReports.map((report) => report.event));
    return [
      ...EVENT_ORDER.filter((event) => present.has(event)),
      ...Array.from(present).filter((event) => !EVENT_ORDER.includes(event)).sort(),
    ];
  }, [raceReports]);
  const filteredReports = useMemo(
    () => raceReports.filter((report) => eventFilter === "ALL" || report.event === eventFilter),
    [eventFilter, raceReports],
  );
  const selectedReport = useMemo(() => {
    return (
      raceReports.find((report) => report.reportId === selectedReportId) ??
      filteredReports[0] ??
      raceReports[0]
    );
  }, [filteredReports, raceReports, selectedReportId]);
  const standings = useMemo(() => {
    const report = data?.reports.find((candidate) => candidate.kind === "TeamStandings");
    return report?.results.length ? report.results : (selectedReport?.standings ?? []);
  }, [data, selectedReport]);
  const splitColumns = useMemo(() => {
    const distances = new Set<number>();
    for (const row of selectedReport?.results ?? []) {
      for (const split of row.splits ?? []) distances.add(split.distance);
    }
    return Array.from(distances).sort((left, right) => left - right);
  }, [selectedReport]);

  function chooseFilter(filter: string) {
    setEventFilter(filter);
    const first = raceReports.find((report) => filter === "ALL" || report.event === filter);
    if (first) setSelectedReportId(first.reportId);
  }

  const status = data?.demo ? "Demo feed" : "Live from Roblox";
  const sectionHeading = selectedReport?.stage === "HEATS"
    ? "Heat (Pl)"
    : selectedReport?.stage === "SEMIFINAL"
      ? "Semi (Pl)"
      : "Sec (Pl)";

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="StrideSync home">
          <span className="brand-logo" aria-hidden="true">
            <span>SS</span>
            <i />
            <i />
            <i />
          </span>
          <span className="brand-copy">
            <strong>StrideSync AI Championships</strong>
            <span>Roblox Server Results · Live Meet</span>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#live">Live Race</a>
          <a href="#events">Event Index</a>
          <a href="#results">Results</a>
          <a href="#standings">Team Standings</a>
          <a href="#connection">API Setup</a>
        </nav>
      </header>

      <main id="top">
        <section className="meet-hero" aria-labelledby="meet-title">
          <div>
            <p className="eyebrow">SERVER-AUTHORITATIVE TRACK RESULTS</p>
            <h1 id="meet-title">AI Championship Results Center</h1>
            <p>Every finish from your Roblox meet, organized like a professional timing board.</p>
          </div>
          <div className="feed-status" role="status">
            <span className={`status-dot ${data?.demo ? "status-dot-demo" : ""}`} />
            <div><strong>{status}</strong><span>Updated {readableTime(data?.updatedAt)}</span></div>
          </div>
        </section>

        {data?.demo && (
          <div className="demo-banner">
            <strong>Preview data is showing.</strong> Real results replace it automatically after Roblox sends the first report.
          </div>
        )}
        {error && <div className="error-banner" role="alert">{error}</div>}

        <LiveRaceBoard />

        <section className="event-controls" id="events" aria-label="Event filters">
          <div className="filter-row">
            <button className={eventFilter === "ALL" ? "active" : ""} onClick={() => chooseFilter("ALL")}>Full Schedule</button>
            {events.map((event) => (
              <button key={event} className={eventFilter === event ? "active" : ""} onClick={() => chooseFilter(event)}>
                {event}
              </button>
            ))}
          </div>
          <button className="refresh-button" onClick={() => void loadResults(true)} disabled={refreshing}>
            <span aria-hidden="true">↻</span> {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </section>

        <section className="schedule-card" aria-labelledby="schedule-title">
          <div className="section-heading">
            <div><p className="eyebrow">MEET INDEX</p><h2 id="schedule-title">Latest events</h2></div>
            <span>{filteredReports.length} result {filteredReports.length === 1 ? "set" : "sets"}</span>
          </div>
          <div className="table-scroll">
            <table className="schedule-table">
              <thead><tr><th>Category</th><th>Event</th><th>Round</th><th>Entries</th><th>Result</th><th>Status</th></tr></thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.reportId} className={selectedReport?.reportId === report.reportId ? "selected-row" : ""}>
                    <td>{report.category}</td>
                    <td><button className="table-link" onClick={() => setSelectedReportId(report.reportId)}>{eventLabel(report.event)}</button></td>
                    <td>{report.roundName}</td>
                    <td>{report.rowCount}</td>
                    <td><button className="result-link" onClick={() => setSelectedReportId(report.reportId)}>View result</button></td>
                    <td><span className={`status-pill ${report.isFinal ? "complete" : "advancing"}`}>{report.isFinal ? "Complete" : report.stage}</span></td>
                  </tr>
                ))}
                {!loading && filteredReports.length === 0 && <tr><td colSpan={6} className="empty-cell">No result reports for this event yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <div className="content-grid">
          <section className="results-card" id="results" aria-labelledby="results-title">
            {selectedReport ? (
              <>
                <div className="result-summary">
                  <div>
                    <p className="eyebrow">RESULTS · {selectedReport.stage}</p>
                    <h2 id="results-title">{selectedReport.category} {eventLabel(selectedReport.event)}</h2>
                    <p>{selectedReport.roundName} · {selectedReport.rowCount} starters</p>
                    {selectedReport.stage === "HEATS" && <p className="qualification-note"><strong>Q</strong> top 3 each heat · <strong>q</strong> next 6 fastest times</p>}
                    {selectedReport.stage === "SEMIFINAL" && <p className="qualification-note"><strong>Q</strong> 8 fastest times advance</p>}
                  </div>
                  <span className="complete-stamp">{selectedReport.isFinal ? "COMPLETE" : "ADVANCING"}</span>
                </div>
                <div className="table-scroll">
                  <table className="results-table">
                    <thead><tr><th>Pl</th><th>Athlete</th><th>Team</th>{splitColumns.map((distance) => <th key={distance}>{distance}m split</th>)}<th>Time</th><th>{sectionHeading}</th><th>{selectedReport.isFinal ? "Pts" : "Gap"}</th><th>Status</th></tr></thead>
                    <tbody>
                      {selectedReport.results.map((row) => (
                        <tr key={`${row.rank}-${row.name}`}>
                          <td className="place-cell"><span className={row.rank <= 3 ? `medal-place place-${row.rank}` : ""}>{row.rank}</span></td>
                          <td><strong>{row.name}</strong></td>
                          <td><div className="team-cell"><TeamLogo row={row} /></div></td>
                          {splitColumns.map((distance) => {
                            const split = (row.splits ?? []).find((candidate) => candidate.distance === distance);
                            return <td key={distance} className="split-time-cell">{split ? <>{split.time}<small>{split.position ? `(${split.position})` : ""}</small></> : "—"}</td>;
                          })}
                          <td className="time-cell">{row.time}</td>
                          <td className="section-cell">{row.section ? `${row.section}(${row.sectionPlace ?? "—"})` : "—"}</td>
                          <td>{selectedReport.isFinal ? (row.points ?? "—") : (row.gap ? `+${row.gap.toFixed(2)}` : "—")}</td>
                          <td>{row.status && <span className={`result-status ${row.status === "Q" || row.status === "q" ? "qualified" : ""}`}>{row.status}</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <footer className="result-footer"><span>Report ID {selectedReport.reportId.slice(0, 8)}</span><span>Received {readableTime(selectedReport.receivedAt ?? selectedReport.capturedAt)}</span></footer>
              </>
            ) : <div className="empty-state"><h2 id="results-title">Waiting for the first event</h2><p>The result board will fill automatically.</p></div>}
          </section>

          <aside className="standings-card" id="standings" aria-labelledby="standings-title">
            <div className="section-heading compact"><div><p className="eyebrow">CHAMPIONSHIP</p><h2 id="standings-title">Team standings</h2></div></div>
            <ol className="standings-list">
              {standings.slice(0, 8).map((row) => (
                <li key={`${row.rank}-${row.team}`}>
                  <span className="standing-rank">{row.rank}</span>
                  <TeamLogo row={row} standings />
                  <strong className="standing-points">{row.points ?? 0}<small>PTS</small></strong>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        <section className="connection-card" id="connection" aria-labelledby="connection-title">
          <div className="connection-icon" aria-hidden="true"><span>R</span><i /></div>
          <div><p className="eyebrow">ROBLOX CONNECTION</p><h2 id="connection-title">Built for your existing AIMeetSystem</h2><p>The server-only reporter publishes coalesced live snapshots and final reports. Tokens remain server-only, while curved-lane progress and checkpoint splits come straight from the authoritative AI controller.</p></div>
          <div className="connection-meta"><span><i className="mini-dot" /> Ingest endpoints ready</span><code>POST /api/live</code><code>POST /api/results</code></div>
        </section>
      </main>

      <footer className="site-footer"><span>StrideSync Results Engine</span><span>Server authoritative · Live 2s · Results 12s</span></footer>
    </div>
  );
}
