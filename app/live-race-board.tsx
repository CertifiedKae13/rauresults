"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LiveEntrant, LiveResponse } from "../lib/live-types";

const TEAM_LOGOS: Record<string, string> = {
  UF: "/team-logos/florida.svg",
  UT: "/team-logos/texas.svg",
  USC: "/team-logos/usc.svg",
  LSU: "/team-logos/lsu.svg",
  UO: "/team-logos/oregon.svg",
  UGA: "/team-logos/georgia.svg",
};

function formatTimer(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remaining = safe - minutes * 60;
  return minutes > 0
    ? `${minutes}:${remaining.toFixed(2).padStart(5, "0")}`
    : remaining.toFixed(2).padStart(5, "0");
}

function lastSplit(entrant: LiveEntrant): string {
  const split = (entrant.splits ?? []).at(-1);
  if (!split) return "—";
  return `${split.label}  ${split.time}${split.position ? `  (${split.position})` : ""}`;
}

function sectorLabel(distance: number, checkpoints: number[], eventDistance: number): string {
  if (distance >= eventDistance) return "Finished";
  const marks = [...checkpoints.filter((mark) => mark > 0 && mark < eventDistance), eventDistance];
  const upper = marks.find((mark) => distance < mark) ?? eventDistance;
  const lower = [...marks].reverse().find((mark) => mark <= distance) ?? 0;
  return `${lower}–${upper}m`;
}

function LiveTeamLogo({ entrant }: { entrant: LiveEntrant }) {
  const logo = TEAM_LOGOS[entrant.teamAbbr.toUpperCase()];
  if (logo) {
    return <Image src={logo} alt={`${entrant.team} logo`} width={38} height={32} />;
  }
  return (
    <span className="live-team-fallback" style={{ "--team-color": entrant.teamColor } as React.CSSProperties}>
      {entrant.teamAbbr.slice(0, 3)}
    </span>
  );
}

export function LiveRaceBoard() {
  const [response, setResponse] = useState<LiveResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [clockNow, setClockNow] = useState(() => Date.now() / 1000);

  const loadLive = useCallback(async () => {
    try {
      const request = await fetch("/api/live", { cache: "no-store" });
      if (!request.ok) throw new Error(`Live timing request failed (${request.status})`);
      setResponse(await request.json() as LiveResponse);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Live timing is unavailable");
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void loadLive(), 0);
    const poll = window.setInterval(() => void loadLive(), 500);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(poll);
    };
  }, [loadLive]);

  useEffect(() => {
    const tick = window.setInterval(() => setClockNow(Date.now() / 1000), 40);
    return () => window.clearInterval(tick);
  }, []);

  const live = response?.live ?? null;
  const displayTimer = useMemo(() => {
    if (!live) return 0;
    if (!live.timerRunning) return live.timerSeconds;
    return live.timerSeconds + Math.max(0, clockNow - live.capturedAtUnix);
  }, [clockNow, live]);

  if (!live) {
    return (
      <section className="live-board live-board-idle" id="live" aria-labelledby="live-title">
        <div>
          <p className="live-kicker">LIVE RACE</p>
          <h2 id="live-title">Waiting for the next heat</h2>
          <p>{loadError || "The live board opens automatically when the Roblox race clock starts."}</p>
        </div>
        <span className="live-idle-clock">00.00</span>
      </section>
    );
  }

  return (
    <section className="live-board" id="live" aria-labelledby="live-title">
      <div className="live-board-head">
        <div className="live-event-copy">
          <p className="live-kicker"><span aria-hidden="true" /> {live.status === "RUNNING" ? "LIVE NOW" : "RACE COMPLETE"}</p>
          <h2 id="live-title">{live.category} {live.event} · {live.roundName}</h2>
          <p aria-live="polite">{live.entrants.length} athletes · lane-path tracking · {response?.demo ? "preview feed" : "Roblox server feed"}</p>
        </div>
        <div className="live-clock-wrap" aria-label={`Race time ${formatTimer(displayTimer)}`}>
          <span>RACE CLOCK</span>
          <strong aria-hidden="true">{formatTimer(displayTimer)}</strong>
        </div>
        <div className="record-card">
          <span>{live.worldRecord?.label ?? "World record"}</span>
          <strong>{live.worldRecord?.time ?? "—"}</strong>
          <small>{live.worldRecord ? `${live.worldRecord.athlete} · ${live.worldRecord.country} ${live.worldRecord.year}` : "Record unavailable"}</small>
        </div>
      </div>

      <div className="live-table-scroll">
        <table className="live-table">
          <thead>
            <tr><th>Live</th><th>Lane</th><th>Athlete</th><th>Team</th><th>Track sector</th><th>Distance</th><th>Time</th><th>Latest split</th></tr>
          </thead>
          <tbody>
            {live.entrants.map((entrant) => (
              <tr key={`${entrant.lane}-${entrant.name}`} className={entrant.rank === 1 ? "live-leader" : ""}>
                <td><span className="live-rank">{entrant.rank}</span></td>
                <td className="live-lane">{entrant.lane || "—"}</td>
                <td><strong>{entrant.name}</strong>{entrant.rank === 1 && <small className="leader-label">Leader</small>}</td>
                <td><span className="live-team"><LiveTeamLogo entrant={entrant} /><small>{entrant.teamAbbr}</small></span></td>
                <td>
                  <span className="sector-copy">{sectorLabel(entrant.distanceMeters, live.checkpoints, live.eventDistance)}</span>
                  <span className="progress-track" aria-hidden="true"><i style={{ width: `${entrant.progress * 100}%` }} /></span>
                </td>
                <td className="distance-cell">{entrant.distanceMeters.toFixed(1)}m</td>
                <td className={`live-time-cell${entrant.finishTime ? " official" : ""}`}>
                  {entrant.finishTime ?? (live.timerRunning ? formatTimer(displayTimer) : entrant.currentTime)}
                  <small>{entrant.finishTime ? "OFFICIAL" : "LIVE"}</small>
                </td>
                <td className="split-cell">{lastSplit(entrant)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="live-board-footer">
        <span>Positions compare normalized distance along each curved lane path.</span>
        <span>Live snapshots refresh every 0.5 seconds.</span>
      </footer>
    </section>
  );
}
