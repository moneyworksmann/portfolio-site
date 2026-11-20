import Link from "next/link";
import DarkPage from "@/components/DarkPage";
import { listPosts, fmtDate } from "@/lib/posts";

export const metadata = { title: "Writing" };

export default function Writing() {
  const posts = listPosts();
  return (
    <DarkPage name="Writing">
      <div className="px-5 md:px-24 pt-24 pb-12 max-w-[1100px]">
        <h1 className="display">Writing</h1>
        <p className="mt-6 max-w-[60ch] text-[var(--paper-soft)]">Short notes on markets and the economy: what happened, why it matters, and what I&apos;d watch next. Sources are linked in every post.</p>
      </div>
      <ul className="px-5 md:px-24 pb-24 max-w-[1100px]">
        {posts.map((p) => (
          <li key={p.slug} style={{ borderTop: "1px solid var(--line-dark)" }}>
            <Link href={`/writing/${p.slug}`} className="group grid md:grid-cols-[180px_1fr] gap-x-6 gap-y-1 py-7">
              <span className="mono small text-[var(--paper-soft)] pt-2">{fmtDate(p.date)}</span>
              <span>
                <span className="text-[clamp(22px,2.6vw,30px)] font-medium tracking-tight group-hover:underline underline-offset-4">{p.title}</span>
                {p.dek && <span className="block mt-1 text-[var(--paper-soft)] max-w-[64ch]">{p.dek}</span>}
              </span>
            </Link>
          </li>
        ))}
        {posts.length === 0 && <li className="text-[var(--paper-soft)]">New notes are on the way.</li>}
      </ul>
    </DarkPage>
  );
}
