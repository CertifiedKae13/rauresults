import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StrideSync Live Results",
  description: "Live Roblox AI track meet results.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "StrideSync Live Results",
    description: "Server-authoritative Roblox AI track timing, live order, splits, records, and final results.",
    type: "website",
    images: [{ url: "/stridesync-live-og.png", width: 1200, height: 630, alt: "StrideSync live AI track results" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StrideSync Live Results",
    description: "Live Roblox AI race timing, lane-aware order, checkpoint splits, and final results.",
    images: ["/stridesync-live-og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
