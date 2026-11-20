import Link from "next/link";
import { ME, EXPERIENCE, COURSEWORK, SKILLS } from "@/content/site";
import PrintButton from "./PrintButton";

export const metadata = { title: "Résumé" };

/** The résumé as a page (printable to PDF from the browser). Phone number left out on purpose. */
export default function Resume() {
  return (
    <main className="max-w-[820px] mx-auto px-5 py-16 print:py-0">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden mb-10">
        <Link href="/" className="small text-[var(--ink-soft)] hover:text-[var(--ink)]">← {ME.name}</Link>
        <PrintButton />
      </div>
      <header>
        <h1 className="text-[40px] font-medium tracking-tight leading-none">{ME.name}</h1>
        <p className="mt-3 small text-[var(--ink-soft)]">
          <a href={`mailto:${ME.email}`} className="prose-link">{ME.email}</a> · <a href={ME.linkedin} className="prose-link">linkedin.com/in/mann-patel-b3a012298</a>
        </p>
      </header>
      <Section title="Education">
        <Row a={ME.school} b="New Brunswick, NJ" />
        <Row a={`${ME.degree} · GPA ${ME.gpa}`} b={`Jan 2023 – Dec 2026`} soft />
        <p className="small mt-2"><span className="text-[var(--ink-soft)]">Coursework:</span> {COURSEWORK.join(", ")}</p>
      </Section>
      <Section title="Experience">
        {EXPERIENCE.map((e) => (
          <div key={e.org} className="mb-5">
            <Row a={e.org} b={e.where} />
            <Row a={e.role} b={e.when} soft />
            <ul className="mt-1.5 list-disc pl-5 small space-y-0.5">{e.points.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        ))}
      </Section>
      <Section title="Projects">
        <p className="small">Whale Tracker (13F holdings, Next.js/SQLite) · QuantFlow (point-in-time signal engine, Python/DuckDB) · Equity research agents (16-agent report generator) · Credit-risk SQL pipeline · SkyFuel AI (XGBoost + SHAP surrogate). Demos at this site&apos;s /work.</p>
      </Section>
      <Section title="Skills">
        {Object.entries(SKILLS).map(([k, v]) => <p key={k} className="small"><span className="text-[var(--ink-soft)]">{k}:</span> {v.join(", ")}</p>)}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-10"><h2 className="label text-[var(--ink-soft)] pb-2 mb-4" style={{ borderBottom: "1px solid var(--line-light)" }}>{title.toUpperCase()}</h2>{children}</section>;
}
function Row({ a, b, soft }: { a: string; b: string; soft?: boolean }) {
  return <div className={`flex flex-wrap justify-between gap-x-4 ${soft ? "small text-[var(--ink-soft)]" : "font-medium"}`}><span>{a}</span><span className={soft ? "mono" : "small text-[var(--ink-soft)] font-normal"}>{b}</span></div>;
}
