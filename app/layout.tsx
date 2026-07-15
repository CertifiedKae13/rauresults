import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StrideSync Live Results",
  description: "Live Roblox AI track meet results.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "StrideSync Live Results",
    description: "Server-authoritative Roblox AI track meet results, live on the web.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
