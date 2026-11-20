/** Fallback: shows the top-level numbers of a dataset while a project's dedicated demo is built. */
export default function GenericDemo({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([k, v]) => !["asOf", "source"].includes(k) && (typeof v === "number" || typeof v === "string")).slice(0, 12);
  return entries.length ? (
    <dl className="grid sm:grid-cols-2 md:grid-cols-3 gap-px" style={{ background: "var(--line-dark)" }}>
      {entries.map(([k, v]) => <div key={k} className="p-4" style={{ background: "var(--night-2)" }}><dt className="small text-[var(--paper-soft)]">{k}</dt><dd className="mono mt-1">{String(v)}</dd></div>)}
    </dl>
  ) : <p className="text-[var(--paper-soft)]">Interactive view coming soon.</p>;
}
