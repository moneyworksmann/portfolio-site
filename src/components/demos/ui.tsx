/**
 * Shared bits for demos (dark panel context). Colours: tokens from globals.css;
 * chart series in the validated categorical order (dark steps), always with labels.
 */
export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"];
export const OTHER = "#5a5e66";

export const pct = (v: number | null | undefined, d = 1) => (v == null || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(d)}%`);
export const signedPct = (v: number | null | undefined, d = 1) => (v == null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${(v * 100).toFixed(d)}%`);
export const usd = (v: number | null | undefined, d = 2) => (v == null || !Number.isFinite(v) ? "—" : `$${v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`);
export const big = (v: number | null | undefined) => {
  if (v == null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  return a >= 1e12 ? `${s}$${(a / 1e12).toFixed(2)}T` : a >= 1e9 ? `${s}$${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `${s}$${(a / 1e6).toFixed(1)}M` : `${s}$${a.toLocaleString("en-US")}`;
};
export const tone = (v: number | null | undefined) => (v == null ? "" : v > 0 ? "text-[var(--pos)]" : v < 0 ? "text-[var(--neg)]" : "");

/** Segmented tabs for switching views inside a demo. */
export function Tabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1">
      {options.map(([v, l]) => (
        <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)}
          className="h-9 px-3 small transition-colors" style={value === v ? { background: "var(--paper)", color: "var(--night)" } : { border: "1px solid var(--line-dark)", color: "var(--paper-soft)" }}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, cls }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className="p-4" style={{ background: "var(--night)" }}>
      <div className="small text-[var(--paper-soft)]">{label}</div>
      <div className={`mono text-[22px] mt-1 ${cls ?? ""}`}>{value}</div>
      {sub && <div className="small text-[var(--paper-soft)] mt-0.5">{sub}</div>}
    </div>
  );
}
