import Link from "next/link";
import DarkPage from "@/components/DarkPage";
import { ME, EXPERIENCE, COURSEWORK, SKILLS } from "@/content/site";

export const metadata = { title: "About" };

export default function About() {
  return (
    <DarkPage name="About">
      <div className="px-5 md:px-24 pt-24 pb-24 max-w-[1100px]">
        <h1 className="display">About</h1>
        <p className="statement mt-10 max-w-[30ch]">I&apos;m {ME.name}. I study finance and accounting at Rutgers, and I build software to answer the questions my coursework raises.</p>
        <div className="mt-10 max-w-[64ch] space-y-4 text-[var(--paper-soft)]">
          <p>I&apos;m a {ME.degree} student at {ME.school} (GPA {ME.gpa}), graduating in {ME.graduating}. Alongside classes I&apos;ve worked in a university business office on budgets and reconciliations, prepared tax returns for 50+ households through VITA, and supervised a recreation facility serving over a thousand people a day.</p>
          <p>Most of my projects start with a finance question (what are the best investors buying, does this signal survive an honest backtest, what is this company worth) and end with a tool that answers it from public data. Lately that includes AI agents, used carefully: they draft and check, and a person decides.</p>
        </div>

        <h2 className="label text-[var(--paper-soft)] mt-20 mb-4">EXPERIENCE</h2>
        <ul style={{ borderTop: "1px solid var(--line-dark)" }}>
          {EXPERIENCE.map((e) => (
            <li key={e.org} className="grid md:grid-cols-[260px_1fr] gap-x-8 gap-y-2 py-7" style={{ borderBottom: "1px solid var(--line-dark)" }}>
              <div><p className="font-medium">{e.role}</p><p className="small text-[var(--paper-soft)]">{e.org}<br />{e.where} · <span className="mono">{e.when}</span></p></div>
              <ul className="space-y-1.5">{e.points.map((x) => <li key={x} className="pl-5 relative"><span className="absolute left-0 text-[var(--paper-soft)]">—</span>{x}</li>)}</ul>
            </li>
          ))}
        </ul>

        <div className="grid md:grid-cols-2 gap-12 mt-20">
          <div>
            <h2 className="label text-[var(--paper-soft)] mb-4">COURSEWORK</h2>
            <ul className="space-y-1.5">{COURSEWORK.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
          <div>
            <h2 className="label text-[var(--paper-soft)] mb-4">SKILLS</h2>
            <dl className="space-y-4">{Object.entries(SKILLS).map(([k, v]) => <div key={k}><dt className="small text-[var(--paper-soft)]">{k}</dt><dd>{v.join(" · ")}</dd></div>)}</dl>
          </div>
        </div>

        <div className="mt-20 flex flex-wrap gap-3">
          <a href={`mailto:${ME.email}`} className="btn btn-primary">{ME.email}</a>
          <a href={ME.linkedin} target="_blank" rel="noopener noreferrer" className="btn">LinkedIn ↗</a>
          <Link href="/resume" className="btn">Résumé</Link>
        </div>
      </div>
    </DarkPage>
  );
}
