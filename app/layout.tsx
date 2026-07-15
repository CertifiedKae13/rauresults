import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAU Live Results",
  description: "Live Roblox AI track meet results.",
  icons: { icon: "/rau-logo.png", shortcut: "/rau-logo.png", apple: "/rau-logo.png" },
  openGraph: {
    title: "RAU Live Results",
    description: "Server-authoritative Roblox AI track timing, live order, splits, records, and final results.",
    type: "website",
    images: [{ url: "/rau-logo.png", width: 140, height: 134, alt: "RAU live AI track results" }],
  },
  twitter: {
    card: "summary",
    title: "RAU Live Results",
    description: "Live Roblox AI race timing, lane-aware order, checkpoint splits, and final results.",
    images: ["/rau-logo.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
