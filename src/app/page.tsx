import Link from "next/link";
import Menu from "@/components/Menu";
import Mark from "@/components/Mark";
import { ME, EXPERIENCE } from "@/content/site";
import { PROJECTS } from "@/content/projects";
import { listPosts, fmtDate } from "@/lib/posts";
import { menuStats, hasDemo } from "@/lib/stats";

export default function Home() {
  const stats = menuStats();
  const featured = PROJECTS.filter((p) => p.featured);
  const posts = listPosts().slice(0, 3);
  return (
    <>
      {/* One statement on white, the mark that opens the menu at the bottom. */}
      <section className="min-h-svh flex flex-col justify-between px-5 md:px-[12vw] pt-[12vh] pb-10">
        <div className="max-w-[760px]">
          <h1 className="statement">{ME.name} {ME.statement}</h1>
          <p className="mt-6 text-[var(--ink-soft)] max-w-[56ch]">
            Finance &amp; Accounting, {ME.school}, graduating {ME.graduating}. Below: what I&apos;m building now, projects you can try, and notes on markets.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/work" className="btn btn-primary">See my work →</Link>
            <a href={ME.linkedin} target="_blank" rel="noopener noreferrer" className="btn">LinkedIn ↗</a>
            <Link href="/resume" className="btn btn-quiet">Résumé</Link>
          </div>
        </div>
        <div className="flex items-end justify-between gap-6">
          <Menu stats={stats}><Mark size={44} /><span className="small text-[var(--ink-soft)]">Menu</span></Menu>
          <a href="#now" className="small text-[var(--ink-soft)] hover:text-[var(--ink)]">Scroll ↓</a>
        </div>
      </section>

      <section id="now" className="px-5 md:px-[12vw] py-24 scroll-mt-4" style={{ borderTop: "1px solid var(--line-light)" }}>
        <p className="label text-[var(--ink-soft)]">NOW · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        <h2 className="h2 mt-2 max-w-[24ch]">What I&apos;m working on this month</h2>
        <ol className="mt-10 grid md:grid-cols-3 gap-px" style={{ background: "var(--line-light)" }}>
          {ME.now.map((n, i) => (
            <li key={n.title} className="bg-white p-6 md:p-8">
              <span className="mono small text-[var(--ink-soft)]">0{i + 1}</span>
              <h3 className="h3 mt-3">{n.href ? <Link href={n.href} className="prose-link">{n.title}</Link> : n.title}</h3>
              <p className="mt-2 text-[var(--ink-soft)]">{n.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="night px-5 md:px-[12vw] py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label text-[var(--paper-soft)]">SELECTED WORK</p>
            <h2 className="h2 mt-2">Built on real data, each with a demo you can open</h2>
          </div>
          <Link href="/work" className="btn">All {PROJECTS.length} projects →</Link>
        </div>
        <ul className="mt-12" style={{ borderTop: "1px solid var(--line-dark)" }}>
          {featured.map((p, i) => (
            <li key={p.slug} style={{ borderBottom: "1px solid var(--line-dark)" }}>
              <Link href={`/work/${p.slug}`} className="group grid md:grid-cols-[64px_1fr_auto] gap-x-6 gap-y-1 items-baseline py-7">
                <span className="mono small text-[var(--paper-soft)]">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="text-[clamp(26px,3.6vw,40px)] font-medium tracking-tight group-hover:underline underline-offset-8 decoration-1">{p.title}</span>
                  <span className="block mt-1 text-[var(--paper-soft)] max-w-[60ch]">{p.oneLine}</span>
                </span>
                <span className="small text-[var(--paper-soft)]">{p.group}{hasDemo(p.slug) ? " · demo" : ""} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 md:px-[12vw] py-24">
        <p className="label text-[var(--ink-soft)]">HOW I WORK</p>
        <div className="mt-8 grid md:grid-cols-3 gap-10">
          {[
            ["Point-in-time, always", "Backtests use only what was knowable on the day. Removed and delisted stocks stay in the history, so results can't flatter themselves."],
            ["Free, public data", "SEC EDGAR, Cboe and other open sources. Every figure can be traced back to a filing or a price."],
            ["Humans stay in control", "My AI agents draft and check; nothing is sent, traded or published without a person approving it."],
          ].map(([t, d]) => (
            <div key={t}><h3 className="h3">{t}</h3><p className="mt-2 text-[var(--ink-soft)]">{d}</p></div>
          ))}
        </div>
      </section>

      {posts.length > 0 && (
        <section className="px-5 md:px-[12vw] py-24" style={{ borderTop: "1px solid var(--line-light)" }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="label text-[var(--ink-soft)]">WRITING</p><h2 className="h2 mt-2">Notes on markets and the economy</h2></div>
            <Link href="/writing" className="btn btn-quiet">All writing →</Link>
          </div>
          <ul className="mt-10 grid md:grid-cols-3 gap-10">
            {posts.map((p) => (
              <li key={p.slug}>
                <p className="mono small text-[var(--ink-soft)]">{fmtDate(p.date)}</p>
                <Link href={`/writing/${p.slug}`} className="h3 block mt-2 hover:underline underline-offset-4">{p.title}</Link>
                {p.dek && <p className="mt-2 text-[var(--ink-soft)]">{p.dek}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="px-5 md:px-[12vw] py-24" style={{ borderTop: "1px solid var(--line-light)" }}>
        <p className="label text-[var(--ink-soft)]">EXPERIENCE</p>
        <ul className="mt-8">
          {EXPERIENCE.map((e) => (
            <li key={e.org} className="grid md:grid-cols-[1fr_1fr_auto] gap-x-6 py-4" style={{ borderTop: "1px solid var(--line-light)" }}>
              <span className="font-medium">{e.role}</span>
              <span className="text-[var(--ink-soft)]">{e.org}</span>
              <span className="mono small text-[var(--ink-soft)]">{e.when}</span>
            </li>
          ))}
        </ul>
        <Link href="/about" className="btn btn-quiet mt-6">More about me →</Link>
      </section>

      <footer className="night px-5 md:px-[12vw] py-20">
        <h2 className="statement max-w-[18ch]">Hiring for finance, data or research?</h2>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={`mailto:${ME.email}`} className="btn btn-primary">{ME.email}</a>
          <a href={ME.linkedin} target="_blank" rel="noopener noreferrer" className="btn">LinkedIn ↗</a>
          <Link href="/resume" className="btn">Résumé</Link>
        </div>
        <p className="small text-[var(--paper-soft)] mt-16">© {new Date().getFullYear()} {ME.name}. Built by me with Next.js; demos run on recorded sample data.</p>
      </footer>
    </>
  );
}
