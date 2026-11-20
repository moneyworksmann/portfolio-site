"use client";
/**
 * QuantFlow demo: the two strategy sleeves, the blended target book (sortable), and the
 * weekly equity curve vs SPY as % from start. Every figure is read from
 * demo-data/quantflow/data.json; gaps in that data are stated, not filled.
 */
import { Fragment, useEffect, useRef, useState } from "react";
import type { DemoData } from "./Demo";
import { Tabs, Stat, pct, usd, signedPct, tone, SERIES } from "./ui";

type Row = Record<string, unknown>;
const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Row[]) : []);
const obj = (v: unknown): Row => (v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : {});
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, f = ""): string => (typeof v === "string" ? v : f);

const Note = ({ children }: { children: React.ReactNode }) => <p className="small text-[var(--paper-soft)] mt-3">{children}</p>;
const thCls = "text-left font-normal small text-[var(--paper-soft)] px-2 py-2 whitespace-nowrap";
const tdCls = "px-2 py-1.5 whitespace-nowrap";
const rowStyle = { borderTop: "1px solid var(--line-dark)" };
const sleeveName = (s: string) => (s === "mean_reversion" ? "Mean reversion" : s === "momentum" ? "Momentum" : s);

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((e) => setW(Math.max(260, Math.round(e[0].contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

type View = "curve" | "drawdown" | "signals" | "sleeves" | "gaps";

export default function QuantflowDemo({ data }: { data: DemoData }) {
  const [view, setView] = useState<View>("curve");
  const s = obj(data?.summary);
  const hasSummary = Object.keys(s).length > 0;

  return (
    <div className="space-y-5 min-w-0">
      {hasSummary ? (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
            <Stat label="CAGR (blended book)" value={pct(num(s.cagr), 2)} sub={`SPY ${pct(num(s.bench_cagr), 2)}`} />
            <Stat label="Sharpe" value={num(s.sharpe)?.toFixed(2) ?? "—"} sub={`SPY ${num(s.bench_sharpe)?.toFixed(2) ?? "—"}`} />
            <Stat label="Max drawdown" value={pct(num(s.max_drawdown), 1)} cls="text-[var(--neg)]" sub={`SPY ${pct(num(s.bench_max_drawdown), 1)}`} />
            <Stat label="Beta-hedged CAGR" value={signedPct(num(s.alpha_cagr), 2)} cls={tone(num(s.alpha_cagr))} sub={`beta ${num(s.beta)?.toFixed(2) ?? "—"}`} />
          </div>
          <Note>
            {str(s.start, "?")} → {str(s.end, "?")}, net of {num(obj(obj(data?.config).backtest).cost_bps) ?? "?"} bps per side with a {num(obj(obj(data?.config).backtest).execution_lag) ?? "?"}-session execution lag.
            Volatility {pct(num(s.vol), 1)}, daily hit rate {pct(num(s.hit_rate), 1)}, about {num(s.orders_per_year)?.toFixed(0) ?? "—"} orders a year.
            The book trails SPY and its beta-hedged return is negative: most of the return is market exposure.
          </Note>
        </div>
      ) : <Note>No summary statistics in this export.</Note>}

      <Tabs label="QuantFlow view" value={view} onChange={setView}
        options={[["curve", "Equity curve"], ["drawdown", "Drawdown"], ["signals", "Signals"], ["sleeves", "Sleeves"], ["gaps", "Data gaps"]]} />

      {view === "curve" && <CurveView data={data} />}
      {view === "drawdown" && <DrawdownView data={data} />}
      {view === "signals" && <SignalsView data={data} />}
      {view === "sleeves" && <SleevesView data={data} />}
      {view === "gaps" && <GapsView data={data} />}
    </div>
  );
}

/* ---------- Line chart (single y-axis, % values) ---------- */
type Series = { key: string; label: string; color: string; values: (number | null)[] };
function LineChart({ dates, series, aria, fmt, zeroLine = true }: { dates: string[]; series: Series[]; aria: string; fmt: (v: number | null) => string; zeroLine?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [idx, setIdx] = useState<number | null>(null);
  const height = width < 480 ? 220 : 300;
  const pad = { l: 52, r: 12, t: 10, b: 26 };
  const n = dates.length;
  const vals = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  if (!n || !vals.length) return <Note>No points to plot.</Note>;
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  if (hi === lo) hi = lo + 1;
  const span = hi - lo;
  const step = [0.05, 0.1, 0.25, 0.5, 1, 2].find((st) => span / st <= 6) ?? 5;
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const x = (i: number) => pad.l + (n === 1 ? 0 : (i / (n - 1)) * (width - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (height - pad.t - pad.b);
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(+t.toFixed(4));
  const years = dates.map((d, i) => [d.slice(0, 4), i] as const).filter(([yr], i, a) => i === 0 || a[i - 1][0] !== yr);
  const everyYr = width < 480 ? 3 : width < 760 ? 2 : 1;
  const path = (s: Series) => {
    let d = "", open = false;
    s.values.forEach((v, i) => { if (v == null) { open = false; return; } d += `${open ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; open = true; });
    return d;
  };
  const pick = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const i = Math.round(((clientX - r.left - pad.l) / (width - pad.l - pad.r)) * (n - 1));
    setIdx(Math.max(0, Math.min(n - 1, i)));
  };
  const cur = idx ?? n - 1;
  return (
    <div className="space-y-2">
      <div className="small min-h-[3em] flex flex-wrap gap-x-4 gap-y-1" aria-live="polite">
        <span className="mono text-[var(--paper-soft)]">{dates[cur]}{idx == null ? " (latest)" : ""}</span>
        {series.map((s) => (
          <span key={s.key} className="whitespace-nowrap">
            <span className="inline-block w-2.5 h-2.5 mr-1.5 align-middle" style={{ background: s.color }} aria-hidden />
            {s.label} <span className="mono">{fmt(s.values[cur])}</span>
          </span>
        ))}
      </div>
      <div ref={ref} className="w-full">
        <svg width={width} height={height} role="img" aria-label={aria} tabIndex={0} className="block touch-pan-y"
          onMouseMove={(e) => pick(e.clientX, e.currentTarget)} onMouseLeave={() => setIdx(null)}
          onTouchMove={(e) => pick(e.touches[0].clientX, e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              const d = (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 13 : 1);
              setIdx((p) => Math.max(0, Math.min(n - 1, (p ?? n - 1) + d)));
            } else if (e.key === "Escape") setIdx(null);
          }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line-dark)" strokeWidth={zeroLine && t === 0 ? 1.5 : 1} />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--paper-soft)" className="mono">{`${(t * 100).toFixed(0)}%`}</text>
            </g>
          ))}
          {years.filter((_, k) => k % everyYr === 0).map(([yr, i]) => (
            <text key={yr} x={x(i)} y={height - 8} fontSize={11} fill="var(--paper-soft)" textAnchor="middle" className="mono">{yr}</text>
          ))}
          {series.map((s) => <path key={s.key} d={path(s)} fill="none" stroke={s.color} strokeWidth={s.key === "strategy" ? 2.25 : 1.5} />)}
          {idx != null && (
            <g pointerEvents="none">
              <line x1={x(idx)} x2={x(idx)} y1={pad.t} y2={height - pad.b} stroke="var(--paper-soft)" strokeDasharray="3 3" />
              {series.map((s) => s.values[idx] != null && <circle key={s.key} cx={x(idx)} cy={y(s.values[idx] as number)} r={3.5} fill={s.color} stroke="var(--night-2)" />)}
            </g>
          )}
        </svg>
      </div>
      <p className="small text-[var(--paper-soft)]">Hover or drag across the chart; with the chart focused, ← / → step a week (Shift for a quarter).</p>
    </div>
  );
}

/* ---------- Equity curve ---------- */
const CURVE_SERIES: { key: string; label: string }[] = [
  { key: "strategy", label: "Blended book" }, { key: "benchmark", label: "SPY" },
  { key: "momentum", label: "Momentum sleeve" }, { key: "meanReversion", label: "Mean-reversion sleeve" },
];
function CurveView({ data }: { data: DemoData }) {
  const ec = obj(data?.equityCurve);
  const [on, setOn] = useState<string[]>(["strategy", "benchmark"]);
  const pts = arr(ec.points);
  const base = num(ec.base) ?? 1;
  const all = CURVE_SERIES.map((c, i) => ({ ...c, color: SERIES[i], values: pts.map((p) => { const v = num(p[c.key]); return v == null ? null : v / base - 1; }) }))
    .filter((s) => s.values.some((v) => v != null));
  if (!pts.length || !all.length) return <Note>The export has no equity-curve points.</Note>;
  const dates = pts.map((p) => str(p.date, "?"));
  return (
    <div className="space-y-3">
      <div role="group" aria-label="Series shown" className="flex flex-wrap gap-1">
        {all.map((s) => {
          const active = on.includes(s.key);
          return (
            <button key={s.key} type="button" aria-pressed={active}
              onClick={() => setOn((p) => (active ? (p.length > 1 ? p.filter((k) => k !== s.key) : p) : [...p, s.key]))}
              className="h-8 px-2.5 small inline-flex items-center gap-1.5"
              style={active ? { background: "var(--paper)", color: "var(--night)" } : { border: "1px solid var(--line-dark)", color: "var(--paper-soft)" }}>
              <span className="inline-block w-2.5 h-2.5" style={{ background: s.color }} aria-hidden />{s.label}
            </button>
          );
        })}
      </div>
      <LineChart dates={dates} series={all.filter((s) => on.includes(s.key))} fmt={(v) => signedPct(v, 1)}
        aria={`Cumulative return from ${dates[0]} to ${dates[dates.length - 1]}, % from start. Final: ${all.map((s) => `${s.label} ${signedPct(s.values[s.values.length - 1], 1)}`).join(", ")}`} />
      <Note>
        {str(ec.frequency, "Weekly points")}, shown as % from the start value. The final session ({str(data?.lastBar, "last bar")}) shows a zero return because no bar existed for it yet when the run happened.
      </Note>
    </div>
  );
}

function DrawdownView({ data }: { data: DemoData }) {
  const dd = arr(data?.drawdownWeeklyMin);
  if (!dd.length) return <Note>The export has no drawdown series.</Note>;
  const dates = dd.map((p) => str(p.date, "?"));
  const values = dd.map((p) => num(p.dd));
  const worst = values.reduce<number>((m, v) => (v != null && v < m ? v : m), 0);
  return (
    <div>
      <LineChart dates={dates} fmt={(v) => pct(v, 1)} zeroLine
        series={[{ key: "strategy", label: "Blended book drawdown (weekly low)", color: SERIES[0], values }]}
        aria={`Blended book drawdown from peak, weekly minimum; worst ${pct(worst, 1)}`} />
      <Note>Worst weekly low in this series: {pct(worst, 1)}. The config halts new risk at {pct(num(obj(obj(data?.config).portfolio).dd_halt), 0)} and resumes at {pct(num(obj(obj(data?.config).portfolio).dd_resume), 0)}.</Note>
    </div>
  );
}

/* ---------- Signals (sortable) ---------- */
type SortKey = "ticker" | "sleeve" | "weight" | "score" | "price";
function SignalsView({ data }: { data: DemoData }) {
  const sig = obj(data?.signals);
  const rows = arr(sig.positions).map((p) => ({
    ticker: str(p.ticker, "?"), sleeve: str(p.sleeve, "?"), weight: num(p.weight), score: num(p.score), scoreLabel: str(p.scoreLabel),
    price: num(p.price), ret5d: num(p.ret5d), daysHeld: num(p.daysHeld), vol60d: num(p.vol60d), advUsdM: num(p.advUsdM),
  }));
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "weight", dir: -1 });
  const [sleeve, setSleeve] = useState("all");
  if (!rows.length) return <Note>The export has no signal list.</Note>;
  const sleeves = [...new Set(rows.map((r) => r.sleeve))];
  const shown = rows.filter((r) => sleeve === "all" || r.sleeve === sleeve).sort((a, b) => {
    const av = a[sort.key], bv = b[sort.key];
    if (av == null) return 1; if (bv == null) return -1;
    return (typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * sort.dir;
  });
  const total = shown.reduce((s, r) => s + (r.weight ?? 0), 0);
  const th = (k: SortKey, label: string, right?: boolean) => (
    <th key={k} scope="col" className={`${thCls} ${right ? "text-right" : ""}`} aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className="hover:text-[var(--paper)]" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : k === "ticker" || k === "sleeve" ? 1 : -1 }))}>
        {label}{sort.key === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 small text-[var(--paper-soft)]">
        <label className="flex items-center gap-2">Sleeve
          <select value={sleeve} onChange={(e) => setSleeve(e.target.value)} className="h-9 px-2 text-[var(--paper)]" style={{ background: "var(--night)", border: "1px solid var(--line-dark)" }}>
            <option value="all">All ({rows.length})</option>
            {sleeves.map((s) => <option key={s} value={s}>{sleeveName(s)} ({rows.filter((r) => r.sleeve === s).length})</option>)}
          </select>
        </label>
        <span>Target book on <span className="mono">{str(sig.asOf, "?")}</span> · gross exposure <span className="mono">{pct(num(sig.grossExposure), 1)}</span> · shown <span className="mono">{pct(total, 1)}</span></span>
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Blended signal table">
        <table className="w-full small">
          <caption className="sr-only">Blended target positions; column headers sort the table</caption>
          <thead><tr>
            {th("ticker", "Ticker")}{th("sleeve", "Sleeve")}{th("weight", "Weight", true)}
            {th("score", "Score", true)}{th("price", "Price", true)}
            <th scope="col" className={thCls}>Context</th>
          </tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={`${r.ticker}-${r.sleeve}`} style={rowStyle} className="hover:bg-[var(--night)]">
                <td className={`${tdCls} mono`}>{r.ticker}</td>
                <td className={tdCls}>{sleeveName(r.sleeve)}</td>
                <td className={`${tdCls} mono text-right`}>{pct(r.weight, 2)}</td>
                <td className={`${tdCls} mono text-right`} title={r.scoreLabel}>{r.score == null ? "—" : r.sleeve === "momentum" ? signedPct(r.score, 1) : `${r.score.toFixed(2)}σ`}</td>
                <td className={`${tdCls} mono text-right`}>{usd(r.price)}</td>
                <td className={`${tdCls} text-[var(--paper-soft)]`}>
                  {r.sleeve === "mean_reversion"
                    ? <>5-day <span className={`mono ${tone(r.ret5d)}`}>{signedPct(r.ret5d, 1)}</span>{r.daysHeld != null ? <> · held <span className="mono">{r.daysHeld.toFixed(0)}</span> d</> : null}</>
                    : <>60-day vol <span className="mono">{pct(r.vol60d, 0)}</span>{r.advUsdM != null ? <> · ADV <span className="mono">${r.advUsdM.toFixed(0)}M</span></> : null}</>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        Score is the sleeve&apos;s own ranking input: the 12-1 momentum return for momentum names, the 20-day z-score at entry check for mean-reversion names.
        {str(sig.note) ? ` ${str(sig.note)}` : ""}
      </Note>
    </div>
  );
}

/* ---------- Sleeves ---------- */
function SleevesView({ data }: { data: DemoData }) {
  const sleeves = arr(data?.sleeves);
  const corr = obj(data?.correlation);
  const keys = Object.keys(corr);
  if (!sleeves.length) return <Note>The export has no sleeve definitions.</Note>;
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-px" style={{ background: "var(--line-dark)" }}>
        {sleeves.map((s) => {
          const st = obj(s.stats);
          const params = Object.entries(obj(s.params));
          return (
            <article key={str(s.name)} className="p-4 space-y-3" style={{ background: "var(--night)" }}>
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="h3">{sleeveName(str(s.name, "Sleeve"))}</h3>
                <span className="small text-[var(--paper-soft)]"><span className="mono">{pct(num(s.sleeveWeight), 0)}</span> of the book · rebalanced {str(s.rebalance, "—")}</span>
              </header>
              <p className="small">{str(s.description, "No description exported.")}</p>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 small">
                {[["CAGR", pct(num(st.cagr), 2)], ["Sharpe", num(st.sharpe)?.toFixed(2) ?? "—"], ["Max DD", pct(num(st.max_drawdown), 1)], ["Beta", num(st.beta)?.toFixed(2) ?? "—"]].map(([l, v]) => (
                  <div key={l}><dt className="text-[var(--paper-soft)]">{l}</dt><dd className="mono">{v}</dd></div>
                ))}
              </dl>
              {params.length > 0 && (
                <details className="small">
                  <summary className="cursor-pointer text-[var(--paper-soft)]">Parameters</summary>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                    {params.map(([k, v]) => <Fragment key={k}><dt className="mono text-[var(--paper-soft)]">{k}</dt><dd className="mono break-all">{String(v)}</dd></Fragment>)}
                  </dl>
                </details>
              )}
            </article>
          );
        })}
      </div>
      {keys.length > 0 && (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Daily return correlation matrix">
          <table className="small">
            <caption className="text-left small text-[var(--paper-soft)] pb-1">Correlation of daily returns</caption>
            <thead><tr><td /> {keys.map((k) => <th key={k} scope="col" className={`${thCls} text-right`}>{k === "benchmark" ? "SPY" : sleeveName(k)}</th>)}</tr></thead>
            <tbody>
              {keys.map((r) => (
                <tr key={r} style={rowStyle}>
                  <th scope="row" className={`${tdCls} text-left font-normal`}>{r === "benchmark" ? "SPY" : sleeveName(r)}</th>
                  {keys.map((c) => <td key={c} className={`${tdCls} mono text-right`}>{num(obj(corr[r])[c])?.toFixed(2) ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Data gaps ---------- */
function GapsView({ data }: { data: DemoData }) {
  const cov = arr(data?.coverageByYear);
  const rm = obj(data?.readmePublished);
  const rows = arr(rm.rows);
  return (
    <div className="space-y-5">
      <section>
        <h3 className="small text-[var(--paper-soft)] mb-2">Price coverage of the point-in-time universe</h3>
        {cov.length ? (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Coverage by year">
            <table className="w-full small">
              <thead><tr>
                <th scope="col" className={thCls}>Year</th><th scope="col" className={`${thCls} text-right`}>Members</th>
                <th scope="col" className={`${thCls} text-right`}>With prices</th><th scope="col" className={thCls}>Coverage</th>
              </tr></thead>
              <tbody>
                {cov.map((c) => (
                  <tr key={String(c.year)} style={rowStyle} className="hover:bg-[var(--night)]">
                    <td className={`${tdCls} mono`}>{String(c.year ?? "?")}</td>
                    <td className={`${tdCls} mono text-right`}>{num(c.members)?.toFixed(0) ?? "—"}</td>
                    <td className={`${tdCls} mono text-right`}>{num(c.withPrices)?.toFixed(0) ?? "—"}</td>
                    <td className={tdCls}>
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2" style={{ width: `${(num(c.coverage) ?? 0) * 100}px`, background: SERIES[0] }} aria-hidden />
                        <span className="mono">{pct(num(c.coverage), 1)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Note>Coverage by year was not exported.</Note>}
        <Note>
          Early years are missing up to about a quarter of index members, mostly names that later delisted. Delisted names tend to be losers, so early-period returns lean optimistic.
        </Note>
      </section>
      {rows.length > 0 && (
        <section>
          <h3 className="small text-[var(--paper-soft)] mb-2">README headline table (older config, for comparison)</h3>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="README published results">
            <table className="w-full small">
              <thead><tr>
                <th scope="col" className={thCls}>Run</th><th scope="col" className={`${thCls} text-right`}>CAGR</th><th scope="col" className={`${thCls} text-right`}>Sharpe</th>
                <th scope="col" className={`${thCls} text-right`}>Max DD</th><th scope="col" className={`${thCls} text-right`}>Vol</th><th scope="col" className={`${thCls} text-right`}>Orders / yr</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={str(r.label)} style={rowStyle} className="hover:bg-[var(--night)]">
                    <th scope="row" className={`${tdCls} text-left font-normal`}>{str(r.label, "?")}</th>
                    <td className={`${tdCls} mono text-right`}>{pct(num(r.cagr), 2)}</td>
                    <td className={`${tdCls} mono text-right`}>{num(r.sharpe)?.toFixed(2) ?? "—"}</td>
                    <td className={`${tdCls} mono text-right`}>{pct(num(r.maxDrawdown), 1)}</td>
                    <td className={`${tdCls} mono text-right`}>{pct(num(r.vol), 1)}</td>
                    <td className={`${tdCls} mono text-right`}>{num(r.ordersPerYear) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {str(rm.note) && <Note>{str(rm.note)}</Note>}
        </section>
      )}
      <Note>Not exported on purpose: the live paper book, the discretionary book and the trade ledger.</Note>
    </div>
  );
}
