import fs from "node:fs";
import path from "node:path";
import { PROJECTS } from "@/content/projects";
import { listPosts } from "./posts";
import type { MenuStats } from "@/components/Menu";

/** Projects that have exported demo data in demo-data/<slug>/data.json. */
export function hasDemo(slug: string) {
  return fs.existsSync(path.join(process.cwd(), "demo-data", slug, "data.json"));
}
export function menuStats(): MenuStats {
  return { projects: PROJECTS.length, demos: PROJECTS.filter((p) => hasDemo(p.slug)).length, posts: listPosts().length };
}
