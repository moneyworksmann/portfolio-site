"use client";
/**
 * The tile menu: a full-screen <dialog> of coloured tiles, each with one real figure.
 * Opens from a labelled Menu button; Escape or Close dismisses it and focus returns to the button.
 */
import Link from "next/link";
import { useRef } from "react";
import Mark from "./Mark";
import { ME } from "@/content/site";

export type MenuStats = { projects: number; demos: number; posts: number };

export default function Menu({ stats, variant = "light", children }: { stats: MenuStats; variant?: "light" | "dark"; children?: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();
  const tiles: { area: string; label: string; href: string; note: string; external?: boolean }[] = [
    { area: "work", label: "Work", href: "/work", note: `${stats.projects} projects` },
    { area: "now", label: "Now", href: "/#now", note: "what I'm building this month" },
    { area: "writing", label: "Writing", href: "/writing", note: stats.posts ? `${stats.posts} notes on markets` : "first notes coming soon" },
    { area: "demos", label: "Demos", href: "/work#demos", note: `${stats.demos} you can try` },
    { area: "about", label: "About", href: "/about", note: `Rutgers · GPA ${ME.gpa}` },
    { area: "resume", label: "Résumé", href: "/resume", note: `graduating ${ME.graduating}` },
    { area: "linkedin", label: "LinkedIn", href: ME.linkedin, note: "connect ↗", external: true },
    { area: "contact", label: "Contact", href: `mailto:${ME.email}`, note: ME.email, external: true },
  ];
  return (
    <>
      <button type="button" onClick={open} aria-haspopup="dialog" aria-label="Open menu"
        className={`inline-flex items-center gap-3 font-medium ${variant === "dark" ? "text-[var(--paper)]" : ""}`}>
        {children ?? <Mark />}
      </button>
      <dialog ref={ref} className="menu" aria-label="Site menu" onClick={(e) => { if (e.target === ref.current) close(); }}>
        <nav className="tiles">
          {tiles.map((t) => {
            const style = { gridArea: t.area, background: `var(--t-${t.area})`, color: `var(--t-${t.area}-ink)` };
            const body = <><span>{t.label}</span><small>{t.note}</small></>;
            return t.external
              ? <a key={t.area} href={t.href} className="tile" style={style} target={t.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" onClick={close}>{body}</a>
              : <Link key={t.area} href={t.href} className="tile" style={style} onClick={close}>{body}</Link>;
          })}
          <span style={{ gridArea: "mark", background: "var(--ink)" }} className="grid place-items-center" aria-hidden><Mark size={44} /></span>
          <button type="button" onClick={close} className="tile" style={{ gridArea: "close", background: "var(--night)", color: "var(--paper)", alignItems: "flex-start", justifyContent: "center", fontSize: 18 }}>
            Close menu <small>Esc</small>
          </button>
        </nav>
      </dialog>
    </>
  );
}
