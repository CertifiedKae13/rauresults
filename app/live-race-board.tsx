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

  const bubbleTime = live.bubbleDisplayTime ?? (live.bubbleTime === null ? "—" : formatTimer(live.bubbleTime));

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
        <div className="live-reference-stack">
          <div className="record-card">
            <span>{live.worldRecord?.label ?? "World record"}</span>
            <strong>{live.worldRecord?.time ?? "—"}</strong>
            <small>{live.worldRecord ? `${live.worldRecord.athlete} · ${live.worldRecord.country} ${live.worldRecord.year}` : "Record unavailable"}</small>
          </div>
          <div className="bubble-card">
            <span>{live.bubbleProvisional ? "PROVISIONAL BUBBLE" : "QUALIFYING BUBBLE"}</span>
            <strong>{bubbleTime}</strong>
            <small>{live.qualificationRule || "No qualifying cutoff for this race"}</small>
          </div>
        </div>
      </div>

      <div className="live-table-scroll">
        <table className="live-table">
          <thead>
            <tr><th>Live</th><th>Lane</th><th>Athlete</th><th>Team</th><th>Distance</th><th>Time</th><th>Finished time</th></tr>
          </thead>
          <tbody>
            {live.entrants.map((entrant) => (
              <tr key={`${entrant.lane}-${entrant.name}`} className={entrant.rank === 1 ? "live-leader" : ""}>
                <td><span className="live-rank">{entrant.rank}</span></td>
                <td className="live-lane">{entrant.lane || "—"}</td>
                <td>
                  <strong>{entrant.name}</strong>
                  {entrant.qualificationStatus && (
                    <small className={`qualification-label qualification-${entrant.qualificationStatus === "q" ? "time" : "auto"}`}>
                      {entrant.qualificationStatus}
                    </small>
                  )}
                  {entrant.rank === 1 && <small className="leader-label">Leader</small>}
                </td>
                <td><span className="live-team"><LiveTeamLogo entrant={entrant} /><small>{entrant.teamAbbr}</small></span></td>
                <td className="distance-cell">{entrant.distanceMeters.toFixed(1)}m</td>
                <td className="live-time-cell">
                  {formatTimer(displayTimer)}
                  <small>{live.timerRunning ? "LIVE" : "FINAL CLOCK"}</small>
                </td>
                <td className={`finish-time-cell${entrant.finishTime ? " official" : ""}`}>
                  {entrant.finishTime ?? "—"}
                  <small>{entrant.finishTime ? "OFFICIAL" : "RACING"}</small>
                </td>
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
