import Link from "next/link";
import Menu from "./Menu";
import Mark from "./Mark";
import { menuStats } from "@/lib/stats";

/**
 * Inner pages: dark, a slim left rail (page name, menu, home), faint grid lines away from the text.
 * Under 720px the rail becomes a top bar.
 */
export default function DarkPage({ name, children }: { name: string; children: React.ReactNode }) {
  const stats = menuStats();
  return (
    <div className="night min-h-svh relative">
      <div className="grid-lines" aria-hidden>
        <i style={{ left: "62%", top: 40, width: 1, height: 260 }} />
        <i style={{ left: "38%", top: 300, width: 220, height: 1 }} />
        <i style={{ right: 0, top: 0, width: "24%", height: 1 }} />
      </div>
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-12 flex-col items-center justify-between py-4 z-10" style={{ borderRight: "1px solid var(--line-dark)", background: "var(--night)" }}>
        <span className="label text-[var(--paper-soft)]" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{name}</span>
        <Menu stats={stats} variant="dark">
          <span className="grid place-items-center w-12 h-12" style={{ background: "var(--ink)" }}><span className="sr-only">Menu</span><MenuIcon /></span>
        </Menu>
        <Link href="/" className="label text-[var(--paper-soft)] hover:text-[var(--paper)]" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Mann Patel</Link>
      </aside>
      <header className="md:hidden flex items-center justify-between px-5 h-14 sticky top-0 z-10" style={{ background: "var(--night)", borderBottom: "1px solid var(--line-dark)" }}>
        <Link href="/" className="flex items-center gap-2 font-medium"><Mark size={28} /> Mann Patel</Link>
        <Menu stats={stats} variant="dark"><span className="inline-flex items-center gap-2 h-10 px-3" style={{ border: "1px solid var(--line-dark)" }}><MenuIcon /> Menu</span></Menu>
      </header>
      <main className="relative md:pl-12">{children}</main>
    </div>
  );
}

function MenuIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}
