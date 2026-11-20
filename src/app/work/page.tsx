import Link from "next/link";
import DarkPage from "@/components/DarkPage";
import { PROJECTS } from "@/content/projects";
import { hasDemo } from "@/lib/stats";

export const metadata = { title: "Work" };

export default function Work() {
  const groups = ["Finance & data", "AI agents"] as const;
  let n = 0;
  return (
    <DarkPage name="Work">
      <div className="px-5 md:px-24 pt-24 pb-12 max-w-[1200px]">
        <p className="mono small text-[var(--paper-soft)] inline-block px-2 py-1" style={{ border: "1px solid var(--paper-soft)" }}>{PROJECTS.length}</p>
        <h1 className="display mt-6">Work</h1>
        <p id="demos" className="mt-6 max-w-[60ch] text-[var(--paper-soft)]">
          Every project opens to a case study and a demo you can use. Demos run on output recorded from real runs, so they are always up and cost nothing to click.
        </p>
      </div>
      {groups.map((g) => (
        <section key={g} className="px-5 md:px-24 pb-16 max-w-[1200px]">
          <h2 className="label text-[var(--paper-soft)] mb-3">{g.toUpperCase()}</h2>
          <ul style={{ borderTop: "1px solid var(--line-dark)" }}>
            {PROJECTS.filter((p) => p.group === g).map((p) => {
              n++;
              return (
                <li key={p.slug} style={{ borderBottom: "1px solid var(--line-dark)" }}>
                  <Link href={`/work/${p.slug}`} className="group grid md:grid-cols-[64px_1fr_260px] gap-x-6 gap-y-2 py-7 items-baseline">
                    <span className="mono small text-[var(--paper-soft)]">{String(n).padStart(2, "0")}</span>
                    <span>
                      <span className="text-[clamp(26px,3.4vw,40px)] font-medium tracking-tight group-hover:underline underline-offset-8 decoration-1">{p.title}</span>
                      <span className="block mt-1 text-[var(--paper-soft)] max-w-[60ch]">{p.oneLine}</span>
                    </span>
                    <span className="small text-[var(--paper-soft)] md:text-right">
                      <span className="mono">{p.stack.slice(0, 3).join(" · ")}</span>
                      <span className="block mt-1">{hasDemo(p.slug) ? "Demo →" : "Case study →"}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </DarkPage>
  );
}
