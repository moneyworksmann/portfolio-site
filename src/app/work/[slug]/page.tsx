import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import DarkPage from "@/components/DarkPage";
import Demo from "@/components/demos/Demo";
import { PROJECTS, getProject } from "@/content/projects";

export const generateStaticParams = () => PROJECTS.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: PageProps<"/work/[slug]">) {
  const p = getProject((await params).slug);
  return { title: p?.title ?? "Project", description: p?.oneLine };
}

function loadDemo(slug: string): unknown | null {
  const f = path.join(process.cwd(), "demo-data", slug, "data.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
}

export default async function Case({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) notFound();
  const i = PROJECTS.findIndex((x) => x.slug === slug);
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  const data = loadDemo(slug);
  return (
    <DarkPage name={p.title}>
      <article>
        <header className="px-5 md:px-24 pt-24 pb-16 max-w-[1200px]">
          <span className="small inline-block px-3 py-1" style={{ background: "var(--night-2)" }}>{p.group}</span>
          <h1 className="display mt-6">{p.title}</h1>
          <p className="statement mt-8 max-w-[28ch] text-[var(--paper)]">{p.oneLine}</p>
          <p className="mono small text-[var(--paper-soft)] mt-6">{p.stack.join(" · ")}</p>
        </header>

        <section className="px-5 md:px-24 pb-16 grid md:grid-cols-[200px_1fr] gap-6 max-w-[1200px]">
          <h2 className="label text-[var(--paper-soft)] pt-1">THE BRIEF</h2>
          <p className="max-w-[68ch]">{p.brief}</p>
        </section>
        <section className="px-5 md:px-24 pb-16 grid md:grid-cols-[200px_1fr] gap-6 max-w-[1200px]">
          <h2 className="label text-[var(--paper-soft)] pt-1">WHAT I BUILT</h2>
          <ul className="max-w-[68ch] space-y-3">
            {p.built.map((b) => <li key={b} className="pl-5 relative"><span className="absolute left-0 text-[var(--paper-soft)]">—</span>{b}</li>)}
          </ul>
        </section>

        <section id="demo" className="px-5 md:px-24 pb-20 max-w-[1280px] scroll-mt-16">
          <h2 className="label text-[var(--paper-soft)] mb-4">THE DEMO</h2>
          {data ? <Demo slug={slug} data={data} /> : (
            <div className="p-8" style={{ background: "var(--night-2)" }}>
              <p className="text-[var(--paper-soft)]">The demo for this project is being recorded from a real run and will appear here.</p>
            </div>
          )}
        </section>

        <nav className="px-5 md:px-24 py-16 flex flex-wrap items-center justify-between gap-6 max-w-[1200px]" style={{ borderTop: "1px solid var(--line-dark)" }}>
          <Link href={`/work/${next.slug}`} className="group">
            <span className="label text-[var(--paper-soft)]">NEXT CASE</span>
            <span className="block text-[clamp(26px,3.4vw,40px)] font-medium tracking-tight group-hover:underline underline-offset-8 decoration-1">{next.title} →</span>
          </Link>
          <div className="flex gap-3"><Link href="/work" className="btn">All work</Link><Link href="/#now" className="btn btn-quiet">Now</Link></div>
        </nav>
      </article>
    </DarkPage>
  );
}
