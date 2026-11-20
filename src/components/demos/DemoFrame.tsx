/** Panel that every demo sits in, labelled so nobody mistakes a recording for live data. */
export default function DemoFrame({ asOf, source, children }: { asOf?: string; source?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--night-2)", border: "1px solid var(--line-dark)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 small text-[var(--paper-soft)]" style={{ borderBottom: "1px solid var(--line-dark)" }}>
        <span>Demo · recorded from a real run{asOf ? <> on <span className="mono">{String(asOf).slice(0, 10)}</span></> : null}</span>
        {source && <span className="mono truncate max-w-full" title={source}>{source.length > 70 ? `${source.slice(0, 70)}…` : source}</span>}
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
