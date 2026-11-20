/**
 * Blog posts from src/content/posts/*.md (front matter: title, date, tags, status).
 * A post is public unless it still contains a "[VERIFY" note or has `status: hidden`.
 */
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

export type Post = { slug: string; title: string; date: string; tags: string[]; dek: string; body: string };

const DIR = path.join(process.cwd(), "src/content/posts");

function parse(file: string): Post & { hidden: boolean } {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const front = m ? m[1] : "";
  let body = m ? m[2] : raw;
  const get = (k: string) => front.match(new RegExp(`^${k}:\\s*(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "") ?? "";
  const tags = get("tags").replace(/^\[|\]$/g, "").split(",").map((t) => t.trim()).filter(Boolean);
  // The title repeats as the first heading and the italic line under it is the dek.
  body = body.replace(/^\s*#\s+.*\n+/, "");
  const dekMatch = body.match(/^\s*\*([^*\n]+)\*\s*\n/);
  const dek = dekMatch ? dekMatch[1].trim() : "";
  if (dekMatch) body = body.slice(dekMatch[0].length);
  return {
    slug: file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, ""),
    title: get("title"), date: get("date"), tags, dek, body,
    hidden: /\[VERIFY/i.test(raw) || get("status") === "hidden",
  };
}

export function listPosts(): Post[] {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).map(parse).filter((p) => !p.hidden)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const getPost = (slug: string) => listPosts().find((p) => p.slug === slug);
export const renderPost = (p: Post) => marked.parse(p.body, { async: false }) as string;
export const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
