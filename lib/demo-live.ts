import type { LiveEntrant, LiveRace } from "./live-types";

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
  const timerSeconds = 27.34;
  const distances = [251.4, 248.8, 244.2, 238.5, 232.7, 227.1, 219.8, 212.6];
  const entrants: LiveEntrant[] = names.map((name, index) => {
    const team = teams[index % teams.length];
    const split100 = 11.15 + index * 0.06;
    const split200 = 22.34 + index * 0.1;
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
      state: "Running",
      finishPlace: null,
      currentRawTime: timerSeconds,
      currentTime: timerSeconds.toFixed(2),
      finishRawTime: null,
      finishTime: null,
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
    entrants,
  };
}
