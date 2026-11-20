import Link from "next/link";
import { notFound } from "next/navigation";
import DarkPage from "@/components/DarkPage";
import { listPosts, getPost, renderPost, fmtDate } from "@/lib/posts";

export const generateStaticParams = () => listPosts().map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: PageProps<"/writing/[slug]">) {
  const p = getPost((await params).slug);
  return { title: p?.title ?? "Writing", description: p?.dek };
}

export default async function PostPage({ params }: PageProps<"/writing/[slug]">) {
  const p = getPost((await params).slug);
  if (!p) notFound();
  return (
    <DarkPage name="Writing">
      <article className="px-5 md:px-24 pt-24 pb-24 max-w-[860px]">
        <p className="mono small text-[var(--paper-soft)]">{fmtDate(p.date)}</p>
        <h1 className="mt-4 font-medium tracking-tight leading-[1.08] text-[clamp(34px,5vw,56px)]">{p.title}</h1>
        {p.dek && <p className="mt-5 text-[20px] leading-snug text-[var(--paper-soft)]">{p.dek}</p>}
        <div className="post mt-12" dangerouslySetInnerHTML={{ __html: renderPost(p) }} />
        <p className="mt-16"><Link href="/writing" className="btn">All writing</Link></p>
      </article>
    </DarkPage>
  );
}
