import type { LiveEntrant, LiveRace } from "./live-types";
import { orderLiveEntrants } from "./live-order";

const teams = [
  ["UF", "Florida", "#FA4616"],
  ["UT", "Texas", "#BF5700"],
  ["USC", "USC", "#990000"],
  ["LSU", "LSU", "#461D7C"],
  ["UO", "Oregon", "#154733"],
  ["UGA", "Georgia", "#BA0C2F"],
] as const;

const names = [
  "Jordan Montgomery",
  "Eli Brooks",
  "Malik Carter",
  "Noah Whitfield",
  "Darius Coleman",
  "Andre Bell",
  "Micah Foster",
  "Cameron Hayes",
];

export function getDemoLiveRace(): LiveRace {
  const now = Date.now();
  const timerSeconds = 47.18;
  const distances = [400, 400, 400, 400, 397.4, 394.8, 390.2, 386.9];
  const finishTimes = [40.58, 40.68, 40.70, 39.45] as const;
  const entrants: LiveEntrant[] = names.map((name, index) => {
    const team = teams[index % teams.length];
    const split100 = 11.15 + index * 0.06;
    const split200 = 22.34 + index * 0.1;
    const finishRawTime = finishTimes[index] ?? null;
    return {
      rank: index + 1,
      name,
      lane: index + 1,
      gender: "Male",
      team: team[1],
      teamAbbr: team[0],
      teamColor: team[2],
      distanceMeters: distances[index],
      progress: distances[index] / 400,
      state: finishRawTime === null ? "Running" : "Finished",
      finishPlace: finishRawTime === null ? null : index + 1,
      currentRawTime: finishRawTime ?? timerSeconds,
      currentTime: (finishRawTime ?? timerSeconds).toFixed(2),
      finishRawTime,
      finishTime: finishRawTime === null ? null : finishRawTime.toFixed(2),
      qualificationStatus: null,
      splits: [
        { distance: 100, label: "100m", time: split100.toFixed(2), rawTime: split100, position: index + 1 },
        { distance: 200, label: "200m", time: split200.toFixed(2), rawTime: split200, position: index + 1 },
      ],
    };
  });

  return {
    schemaVersion: 1,
    meetId: "demo-meet",
    raceId: "demo-live-400m",
    status: "RUNNING",
    category: "Male",
    roundName: "400M Male Heat 2",
    event: "400M",
    eventDistance: 400,
    timerSeconds,
    timerRunning: true,
    checkpoints: [100, 200, 300],
    bubbleTime: 40.70,
    bubbleDisplayTime: "40.70",
    bubblePlace: 1,
    bubbleTarget: 6,
    bubbleProvisional: true,
    qualificationRule: "TOP 3 EACH HEAT + 6 FASTEST",
    capturedAt: new Date(now).toISOString(),
    capturedAtUnix: now / 1000,
    worldRecord: {
      event: "400M",
      label: "400M WR",
      time: "43.03",
      rawTime: 43.03,
      athlete: "Wayde van Niekerk",
      country: "RSA",
      year: 2016,
    },
    source: { universeId: "demo", placeId: "demo", jobId: "demo" },
    entrants: orderLiveEntrants(entrants).map((entrant, index) => ({
      ...entrant,
      qualificationStatus: index < 3 ? "Q" : index === 3 ? "q" : null,
    })),
  };
}
