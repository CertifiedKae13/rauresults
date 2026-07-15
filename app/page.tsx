import type { Metadata } from "next";
import { ResultsDashboard } from "./results-dashboard";

export const metadata: Metadata = {
  title: "StrideSync Live Results",
  description: "Live server-authoritative Roblox AI track results, event schedules, and team standings.",
};

export default function Home() {
  return <ResultsDashboard />;
}
