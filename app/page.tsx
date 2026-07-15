import type { Metadata } from "next";
import { ResultsDashboard } from "./results-dashboard";

export const metadata: Metadata = {
  title: "RAU Live Results",
  description: "Live server-authoritative Roblox AI track timing, lane-aware race order, checkpoint splits, and results.",
};

export default function Home() {
  return <ResultsDashboard />;
}
