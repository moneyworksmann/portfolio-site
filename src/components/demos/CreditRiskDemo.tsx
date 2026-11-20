"use client";
/**
 * Credit-risk SQL demo: raw vs cleaned loans side by side, the cleaning steps with their
 * SQL and row counts, and default rates by grade / term / income band / purpose.
 * Every figure comes from demo-data/credit-risk-sql/data.json. The raw data is synthetic.
 */
import { useEffect, useRef, useState } from "react";
import type { DemoData } from "./Demo";
import { Tabs, Stat, SERIES } from "./ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : v == null ? d : String(v));
const arr = <T = Any,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const obj = (v: unknown): Record<string, Any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, Any>) : {});
const int = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-US"));

function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((es) => { const cw = es[0]?.contentRect.width; if (cw) setW(Math.round(cw)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const selectStyle = { background: "var(--night)", color: "var(--paper)", border: "1px solid var(--line-dark)" };
const CHANGED_BG = "rgba(122, 160, 255, 0.16)"; // --focus at low alpha

/* ---------- raw vs clean ---------- */
// raw field -> clean field(s); clean-only fields are marked "derived"
const PAIRS: [string | null, string][] = [
  ["loan_id", "loan_id"], ["borrower_id", "borrower_id"], ["loan_amnt", "loan_amnt"], ["term", "term_months"],
  ["int_rate", "int_rate"], ["grade", "grade"], ["sub_grade", "sub_grade"], ["purpose", "purpose"],
  ["issue_d", "issue_year"], ["loan_status", "loan_status"], [null, "is_default"], ["emp_length", "emp_length_yrs"],
  ["annual_inc", "annual_inc"], ["home_ownership", "home_ownership"], ["addr_state", "addr_state"], ["dti", "dti"],
  [null, "income_band"], [null, "in_analysis"],
];
const show = (v: unknown) => (v === null || v === undefined ? "NULL" : typeof v === "string" ? (v === "" ? "(blank)" : `"${v}"`) : String(v));
const same = (raw: unknown, clean: unknown) => {
  if (raw === undefined) return false;
  const r = raw == null ? "" : String(raw);
  if (clean == null) return r === "";
  return r === String(clean);
};

function RawVsClean({ d }: { d: DemoData }) {
  const s = obj(d.sample);
  const raw = arr(s.raw).map(obj), clean = arr(s.clean).map(obj);
  const n = Math.min(raw.length, clean.length);
  const [i, setI] = useState(0);
  const [onlyChanged, setOnlyChanged] = useState(false);
  if (!n) return <p className="text-[var(--paper-soft)]">No sample rows in this dataset.</p>;
  const r = raw[Math.min(i, n - 1)], c = clean[Math.min(i, n - 1)];
  const rows = PAIRS.filter(([rk, ck]) => (rk && rk in r) || ck in c).map(([rk, ck]) => {
    const rv = rk ? r[rk] : undefined, cv = c[ck];
    const derived = rk == null;
    const changed = derived || !same(rv, cv);
    return { rk, ck, rv, cv, derived, changed };
  });
  const visible = onlyChanged ? rows.filter((x) => x.changed) : rows;
  const copies = num(r.copies);
  return (
    <div className="space-y-4">
      {str(s.note) && <p className="small text-[var(--paper-soft)] max-w-[80ch]">{str(s.note)}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <label className="small text-[var(--paper-soft)] flex flex-col gap-1">
          Sample loan
          <select value={i} onChange={(e) => setI(Number(e.target.value))} className="h-10 px-2 small max-w-[300px]" style={selectStyle}>
            {raw.slice(0, n).map((x, j) => <option key={j} value={j}>{str(x.loan_id, `Loan ${j + 1}`)} · {str(x.issue).slice(0, 38)}{str(x.issue).length > 38 ? "…" : ""}</option>)}
          </select>
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn h-10" onClick={() => setI((k) => Math.max(0, k - 1))} disabled={i === 0} style={{ opacity: i === 0 ? 0.45 : 1 }} aria-label="Previous loan">←</button>
          <button type="button" className="btn h-10" onClick={() => setI((k) => Math.min(n - 1, k + 1))} disabled={i >= n - 1} style={{ opacity: i >= n - 1 ? 0.45 : 1 }} aria-label="Next loan">→</button>
        </div>
        <label className="small flex items-center gap-2 h-10 cursor-pointer">
          <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} className="w-4 h-4" />
          Only changed fields
        </label>
      </div>
      <p className="p-3 small" style={{ background: "var(--night)", borderLeft: "3px solid var(--focus)" }}>
        <span className="text-[var(--paper-soft)]">What was messy: </span>{str(r.issue, "—")}
        {copies != null && copies > 1 && <span className="text-[var(--paper-soft)]"> · appears <span className="mono">{copies}×</span> in the raw file</span>}
      </p>
      <div className="overflow-x-auto relative" style={{ border: "1px solid var(--line-dark)" }}>
        <table className="w-full small min-w-[520px]">
          <caption className="sr-only">Raw and cleaned values for loan {str(r.loan_id)}; changed values are marked</caption>
          <thead><tr className="text-[var(--paper-soft)]">
            <th scope="col" className="px-3 py-2 text-left font-medium">Field</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Raw (staging, all text)</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Cleaned (typed)</th>
          </tr></thead>
          <tbody>{visible.map((x) => (
            <tr key={x.ck} style={{ borderTop: "1px solid var(--line-dark)" }}>
              <th scope="row" className="px-3 py-2 text-left font-normal text-[var(--paper-soft)] mono">{x.rk && x.rk !== x.ck ? `${x.rk} → ${x.ck}` : x.ck}</th>
              <td className="px-3 py-2 mono whitespace-pre">{x.derived ? <span className="text-[var(--paper-soft)]">—</span> : show(x.rv)}</td>
              <td className="px-3 py-2 mono" style={x.changed ? { background: CHANGED_BG } : undefined}>
                {show(x.cv)}{x.changed && <span className="ml-2 font-sans text-[12px] text-[var(--paper-soft)]">{x.derived ? "derived" : "changed"}</span>}
              </td>
            </tr>))}</tbody>
        </table>
      </div>
      <p className="small text-[var(--paper-soft)]">Tinted cells changed during cleaning (labelled “changed”) or were derived in SQL (“derived”). Raw strings are shown in quotes so padding is visible.</p>
    </div>
  );
}

/* ---------- cleaning steps ---------- */
const MATCH: [RegExp, RegExp][] = [
  [/deduplicate loans/i, /deduplicate loans/i],
  [/deduplicate borrowers/i, /deduplicate borrowers/i],
  [/median/i, /median|impute/i],
  [/99th|\bcap\b/i, /99th|p99/i],
  [/home_ownership/i, /home_ownership/i],
  [/\bcast\b/i, /^term|issue date/i],
  [/target|is_default/i, /^target/i],
  [/join/i, /join|default rate by grade/i],
];

function RowBars({ before, after, max }: { before: number | null; after: number | null; max: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const labelW = 64, padR = 70, rowH = 26;
  const plotW = Math.max(40, w - labelW - padR);
  const bars = [["Before", before, SERIES[0]], ["After", after, SERIES[1]]] as const;
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div ref={ref}>
      <svg width="100%" viewBox={`0 0 ${w} ${rowH * 2 + 6}`} className="block" role="img" aria-label={`Rows before: ${int(before)}; rows after: ${int(after)}.`}>
        {bars.map(([lab, v, col], i) => (
          <g key={lab} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <text x={labelW - 8} y={i * rowH + 17} fontSize={11.5} textAnchor="end" fill="var(--paper-soft)">{lab}</text>
            {v != null
              ? <rect x={labelW} y={i * rowH + 5} width={Math.max(1, (v / max) * plotW)} height={rowH - 10} fill={col} opacity={hover == null || hover === i ? 1 : 0.6} />
              : <text x={labelW} y={i * rowH + 17} fontSize={11} fill="var(--paper-soft)">not applicable</text>}
            {v != null && <text x={labelW + (v / max) * plotW + 6} y={i * rowH + 17} fontSize={11} fill="var(--paper)" className="mono">{int(v)}</text>}
            <title>{`${lab}: ${int(v)} rows`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Steps({ d }: { d: DemoData }) {
  const steps = arr(d.steps).map(obj);
  const sql = arr(d.sqlSteps).map(obj);
  const [i, setI] = useState(0);
  const rc = obj(d.rowCounts);
  if (!steps.length) return <p className="text-[var(--paper-soft)]">No cleaning steps recorded.</p>;
  const s = steps[Math.min(i, steps.length - 1)];
  const rule = MATCH.find(([sr]) => sr.test(str(s.step)));
  const snippets = rule ? sql.filter((q) => rule[1].test(str(q.caption))) : [];
  const before = num(s.rowsBefore), after = num(s.rowsAfter);
  const max = Math.max(1, ...steps.flatMap((x) => [num(x.rowsBefore) ?? 0, num(x.rowsAfter) ?? 0]));
  const delta = before != null && after != null ? after - before : null;
  const funnel = [["Raw loan rows", num(rc.rawLoanRows)], ["After dedup", num(rc.cleanLoans)], ["Known outcome", num(rc.analysisLoans)]] as const;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        {funnel.map(([l, v]) => <Stat key={l} label={l} value={int(v)} />)}
        <Stat label="Open loans excluded" value={int(num(rc.openLoansExcluded))} />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <button type="button" className="btn h-10" onClick={() => setI((k) => Math.max(0, k - 1))} disabled={i === 0} style={{ opacity: i === 0 ? 0.45 : 1 }}>← Prev</button>
        <button type="button" className="btn h-10" onClick={() => setI((k) => Math.min(steps.length - 1, k + 1))} disabled={i >= steps.length - 1} style={{ opacity: i >= steps.length - 1 ? 0.45 : 1 }}>Next →</button>
        <label className="small text-[var(--paper-soft)] flex flex-col gap-1 ml-auto min-w-0">
          Jump to step
          <select value={i} onChange={(e) => setI(Number(e.target.value))} className="h-10 px-2 small max-w-[280px]" style={selectStyle}>
            {steps.map((x, j) => <option key={j} value={j}>{j + 1}. {str(x.step).slice(0, 48)}{str(x.step).length > 48 ? "…" : ""}</option>)}
          </select>
        </label>
      </div>
      <section aria-label={`Step ${i + 1} of ${steps.length}`} className="p-4 md:p-5 space-y-3" style={{ background: "var(--night)", border: "1px solid var(--line-dark)" }}>
        <p className="label text-[var(--paper-soft)]">STEP {i + 1} OF {steps.length}{str(s.table) ? ` · ${str(s.table)}` : ""}</p>
        <h3 className="text-[20px] font-medium">{str(s.step)}</h3>
        {str(s.detail) && <p>{str(s.detail)}{delta != null && delta !== 0 && <span className="mono text-[var(--paper-soft)]"> ({delta > 0 ? "+" : "−"}{int(Math.abs(delta))} rows)</span>}</p>}
        <RowBars before={before} after={after} max={max} />
        {snippets.length > 0 ? snippets.map((q, j) => (
          <figure key={j} className="mt-2">
            <figcaption className="small text-[var(--paper-soft)] mb-1"><span className="mono">{str(q.file)}</span> · {str(q.caption)}</figcaption>
            <pre className="mono text-[12.5px] leading-relaxed p-3 overflow-x-auto" style={{ background: "var(--night-2)", border: "1px solid var(--line-dark)" }}><code>{str(q.sql)}</code></pre>
          </figure>
        )) : <p className="small text-[var(--paper-soft)]">This step is done by the Python loader; no SQL excerpt.</p>}
      </section>
    </div>
  );
}

/* ---------- default rates ---------- */
type Bar = { label: string; value: number; sub: string };
function BarChart({ bars, overall, title }: { bars: Bar[]; overall: number | null; title: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const labelW = w < 480 ? 112 : 150, padR = 56, rowH = 30, top = 20, axisH = 24;
  const plotW = Math.max(60, w - labelW - padR);
  const maxV = Math.max(overall ?? 0, ...bars.map((b) => b.value));
  const stepV = maxV > 40 ? 10 : 5;
  const axisMax = Math.ceil((maxV * 1.02) / stepV) * stepV || stepV;
  const x = (v: number) => labelW + (v / axisMax) * plotW;
  const h = top + bars.length * rowH + axisH;
  const ticks: number[] = [];
  for (let t = 0; t <= axisMax; t += stepV) ticks.push(t);
  const hv = hover != null ? bars[hover] : null;
  return (
    <div>
      <p className="small text-[var(--paper-soft)] min-h-[1.45em]" aria-live="polite">
        {hv ? <><span className="text-[var(--paper)]">{hv.label}</span>: <span className="mono">{hv.value.toFixed(2)}%</span> default rate · {hv.sub}</> : "Hover a bar for loan counts."}
      </p>
      <div ref={ref}>
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block" role="img" aria-label={`${title}: ${bars.map((b) => `${b.label} ${b.value.toFixed(2)}%`).join(", ")}${overall != null ? `; overall ${overall.toFixed(2)}%` : ""}.`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={top - 4} y2={top + bars.length * rowH} stroke="var(--line-dark)" />
              <text x={x(t)} y={h - 6} fontSize={11} fill="var(--paper-soft)" textAnchor="middle" className="mono">{t}%</text>
            </g>
          ))}
          {bars.map((b, i) => {
            const y = top + i * rowH;
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={0} y={y} width={w} height={rowH} fill="transparent" />
                <text x={labelW - 8} y={y + rowH / 2 + 4} fontSize={11.5} textAnchor="end" fill="var(--paper-soft)">{b.label}</text>
                <rect x={labelW} y={y + 6} width={Math.max(1, x(b.value) - labelW)} height={rowH - 12} fill={SERIES[0]} opacity={hover == null || hover === i ? 1 : 0.6} />
                <text x={x(b.value) + 6} y={y + rowH / 2 + 4} fontSize={11} fill="var(--paper)" className="mono">{b.value.toFixed(2)}%</text>
                <title>{`${b.label}: ${b.value.toFixed(2)}% (${b.sub})`}</title>
              </g>
            );
          })}
          {overall != null && (
            <g>
              <line x1={x(overall)} x2={x(overall)} y1={top - 6} y2={top + bars.length * rowH} stroke="var(--paper)" strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={x(overall)} y={top - 9} fontSize={10.5} fill="var(--paper)" textAnchor="middle" className="mono">overall {overall.toFixed(2)}%</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

type Dim = "grade" | "term" | "income" | "purpose";
function Rates({ d }: { d: DemoData }) {
  const dr = obj(d.defaultRate);
  const overall = num(obj(d.rowCounts).overallDefaultRatePct);
  const [dim, setDim] = useState<Dim>("grade");
  const mk = (rows: Any[], label: (o: Record<string, Any>) => string, sub: (o: Record<string, Any>) => string): Bar[] =>
    rows.map(obj).filter((o) => num(o.default_rate_pct) != null).map((o) => ({ label: label(o), value: num(o.default_rate_pct)!, sub: sub(o) }));
  const sets: Record<Dim, { title: string; bars: Bar[] }> = {
    grade: { title: "Default rate by grade", bars: mk(arr(dr.byGrade), (o) => `Grade ${str(o.grade)}`, (o) => `${int(num(o.loans))} loans, ${int(num(o.defaults))} defaults, avg rate ${num(o.avg_int_rate)?.toFixed(2) ?? "—"}%`) },
    term: { title: "Default rate by term", bars: mk(arr(dr.byTerm), (o) => `${str(o.term_months)} months`, (o) => `${int(num(o.loans))} loans`) },
    income: { title: "Default rate by income band", bars: mk(arr(dr.byIncomeBand), (o) => str(o.income_band).replace(/^\d+\.\s*/, ""), (o) => `${int(num(o.loans))} loans, avg income $${int(num(o.avg_income))}`) },
    purpose: { title: "Default rate by loan purpose", bars: mk(arr(dr.byPurpose), (o) => str(o.purpose).replace(/_/g, " "), (o) => `${int(num(o.loans))} loans`) },
  };
  const cur = sets[dim];
  const g = arr(dr.byGrade).map(obj);
  const ga = num(obj(g[0]).default_rate_pct), gl = num(obj(g[g.length - 1]).default_rate_pct);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Break down default rate by" value={dim} onChange={setDim} options={[["grade", "Grade"], ["term", "Term"], ["income", "Income band"], ["purpose", "Purpose"]]} />
        <p className="small text-[var(--paper-soft)]">{int(num(obj(d.rowCounts).analysisLoans))} loans with a known outcome</p>
      </div>
      <h3 className="font-medium">{cur.title}</h3>
      {cur.bars.length ? <BarChart bars={cur.bars} overall={overall} title={cur.title} /> : <p className="text-[var(--paper-soft)]">No data for this breakdown.</p>}
      {dim === "grade" && ga != null && gl != null && ga > 0 && <p className="small text-[var(--paper-soft)]">Grade {str(obj(g[g.length - 1]).grade)} defaults at <span className="mono">{(gl / ga).toFixed(1)}×</span> the rate of grade {str(obj(g[0]).grade)}.</p>}
      {dim === "term" && <p className="small text-[var(--paper-soft)]">60-month loans outnumber 36-month loans because of a generator quirk (see caveats below).</p>}
      {dim === "income" && <p className="small text-[var(--paper-soft)]">Income band barely moves the rate. The 150k+ band’s high average comes from capped outliers.</p>}
    </div>
  );
}

export default function CreditRiskDemo({ data }: { data: DemoData }) {
  const d = data ?? {};
  const [view, setView] = useState<"rows" | "steps" | "rates">("rows");
  const rc = obj(d.rowCounts);
  return (
    <div className="space-y-6 min-w-0">
      <p className="p-3 small" style={{ border: "1px solid var(--line-dark)", borderLeft: "3px solid var(--paper-soft)" }}>
        <span className="font-medium">Synthetic data.</span> The raw loans are generated by <span className="mono">scripts/generate_data.py</span> to mimic Lending Club’s structure and messiness, so the analysis recovers patterns the generator planted.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        <Stat label="Raw loan rows" value={int(num(rc.rawLoanRows))} />
        <Stat label="Clean loans" value={int(num(rc.cleanLoans))} />
        <Stat label="In analysis" value={int(num(rc.analysisLoans))} />
        <Stat label="Overall default rate" value={num(rc.overallDefaultRatePct) != null ? `${num(rc.overallDefaultRatePct)!.toFixed(2)}%` : "—"} />
      </div>
      <Tabs label="Demo view" value={view} onChange={setView} options={[["rows", "Raw vs clean"], ["steps", "Cleaning steps"], ["rates", "Default rates"]]} />
      <div role="tabpanel" aria-label={view === "rows" ? "Raw vs clean" : view === "steps" ? "Cleaning steps" : "Default rates"}>
        {view === "rows" ? <RawVsClean d={d} /> : view === "steps" ? <Steps d={d} /> : <Rates d={d} />}
      </div>
      {arr(d.caveats).length > 0 && (
        <div>
          <h3 className="label text-[var(--paper-soft)] mb-2">CAVEATS</h3>
          <ul className="small text-[var(--paper-soft)] space-y-1">{arr(d.caveats).map((x, i) => <li key={i} className="pl-4 relative max-w-[80ch]"><span aria-hidden className="absolute left-0">–</span>{str(x)}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
