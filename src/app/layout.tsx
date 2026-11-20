import type { Metadata, Viewport } from "next";
// Fonts are bundled (Fontsource), not fetched from Google at build time, so builds never fail on a font download.
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "./globals.css";
import { ME } from "@/content/site";


export const metadata: Metadata = {
  title: { default: `${ME.name} · Finance, data and the tools in between`, template: `%s · ${ME.name}` },
  description: `${ME.name} ${ME.statement} Projects with working demos, writing on markets, and résumé.`,
  openGraph: { title: ME.name, description: `${ME.name} ${ME.statement}`, type: "website" },
};
export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
