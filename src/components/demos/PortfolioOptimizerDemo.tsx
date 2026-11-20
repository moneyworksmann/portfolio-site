"use client";
/**
 * Portfolio Optimizer demo: the sample 3-fund portfolio vs the app's optimised weights,
 * plus a risk/return scatter with the traced efficient frontier. Every figure is read from
 * demo-data/portfolio-optimizer/data.json; the thin sample is stated, not hidden.
 */
import { useEffect, useRef, useState } from "react";
import type { DemoData } from "./Demo";
import { Stat, usd, SERIES, OTHER } from "./ui";

type Row = Record<string, unknown>;
const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Row[]) : []);
const obj = (v: unknown): Row => (v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : {});
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, f = ""): string => (typeof v === "string" ? v : f);
/** Values in this export are already in percent units (e.g. 8.42 = 8.42%). */
const p = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${v.toFixed(d)}%`);
const sp = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(d)}%`);

const Note = ({ children }: { children: React.ReactNode }) => <p className="small text-[var(--paper-soft)] mt-3">{children}</p>;
const thCls = "text-left font-normal small text-[var(--paper-soft)] px-2 py-2 whitespace-nowrap";
const tdCls = "px-2 py-1.5 whitespace-nowrap";
const rowStyle = { borderTop: "1px solid var(--line-dark)" };

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

type Mix = { key: string; label: string; color: string; ret: number | null; risk: number | null; sharpe: number | null; weights: Record<string, number | null> };
const readMix = (key: string, label: string, color: string, m: Row): Mix => ({
  key, label, color, ret: num(m.annual_return ?? m.ret), risk: num(m.annual_risk ?? m.risk), sharpe: num(m.sharpe),
  weights: Object.fromEntries(Object.entries(obj(m.weights)).map(([k, v]) => [k, num(v)])),
});

export default function PortfolioOptimizerDemo({ data }: { data: DemoData }) {
  const opt = obj(data?.optimization);
  const strat = obj(opt.strategies);
  const frontier = obj(data?.frontier);
  const mixes: Mix[] = [];
  if (Object.keys(obj(strat.current)).length) mixes.push(readMix("current", "Current (sample)", SERIES[0], obj(strat.current)));
  if (Object.keys(obj(strat.optimal)).length) mixes.push(readMix("optimal", "App's optimal", SERIES[1], obj(strat.optimal)));
  if (Object.keys(obj(frontier.maxSharpeUncapped)).length) mixes.push(readMix("uncapped", "Max Sharpe, no cap (demo trace)", SERIES[2], obj(frontier.maxSharpeUncapped)));
  const caveats = Array.isArray(data?.caveats) ? (data.caveats as unknown[]).filter((c): c is string => typeof c === "string") : [];
  const sample = obj(data?.sample);
  const prism = obj(data?.prism);
  const subs = obj(prism.sub_scores);

  if (!mixes.length) return <p className="text-[var(--paper-soft)]">No optimisation results in this export, so there is nothing to compare yet.</p>;
  const cur = mixes.find((m) => m.key === "current");
  const best = mixes.find((m) => m.key === "optimal");

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <p className="small text-[var(--paper-soft)]">
          Sample: {str(sample.label, "built-in sample portfolio")}{num(sample.notionalUsd) != null ? `, ${usd(num(sample.notionalUsd), 0)}` : ""}.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px mt-3" style={{ background: "var(--line-dark)" }}>
          <Stat label="Current Sharpe" value={cur?.sharpe?.toFixed(3) ?? "—"} sub={`return ${p(cur?.ret, 2)} · risk ${p(cur?.risk, 2)}`} />
          <Stat label="App's optimal Sharpe" value={best?.sharpe?.toFixed(3) ?? "—"} sub={`return ${p(best?.ret, 2)} · risk ${p(best?.risk, 2)}`} />
          <Stat label="Sharpe change" value={sp(num(opt.sharpe_improvement), 1)} cls={(num(opt.sharpe_improvement) ?? 0) < 0 ? "text-[var(--neg)]" : "text-[var(--pos)]"} sub={`cap per name ${p(num(opt.max_position_pct), 1)}`} />
          <Stat label="PRISM risk score" value={num(prism.prism_score) != null ? `${num(prism.prism_score)}/100` : "—"}
            sub={Object.keys(subs).length ? Object.entries(subs).map(([k, v]) => `${k} ${num(v) ?? "—"}`).join(" · ") : undefined} />
        </div>
        {(num(opt.sharpe_improvement) ?? 0) < 0 && (
          <p className="small mt-3 p-3" style={{ border: "1px solid var(--line-dark)" }}>
            With three funds, the app caps each name at max(25%, 1/n) = 33.3%, so the max-Sharpe search can only return equal weight. That scores below the current mix.
            This is correct output for this input, but the sample is too small to show the optimiser doing much.
          </p>
        )}
      </div>

      <WeightsChart mixes={mixes} />
      <Trades data={data} />
      <FrontierChart data={data} mixes={mixes} />

      {caveats.length > 0 && (
        <details className="small text-[var(--paper-soft)]">
          <summary className="cursor-pointer">Caveats from the export</summary>
          <ul className="list-disc pl-5 mt-2 space-y-1">{caveats.map((c) => <li key={c}>{c}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

/* ---------- Grouped weight bars ---------- */
function WeightsChart({ mixes }: { mixes: Mix[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ t: string; m: string } | null>(null);
  const tickers = [...new Set(mixes.flatMap((m) => Object.keys(m.weights)))];
  if (!tickers.length) return <Note>No weights were exported.</Note>;
  const labelW = 52, padR = 56, barH = 12, inner = 3, group = mixes.length * (barH + inner) + 14;
  const plotW = Math.max(60, width - labelW - padR);
  const h = tickers.length * group + 20;
  const x = (v: number) => labelW + (v / 100) * plotW;
  const hm = hover ? mixes.find((m) => m.key === hover.m) : null;
  return (
    <section>
      <h3 className="h3 mb-2">Weights: sample vs optimised</h3>
      <div className="small min-h-[1.5em]" aria-live="polite">
        {hover && hm ? <span><span className="text-[var(--paper-soft)]">{hover.t} · {hm.label}:</span> <span className="mono">{p(hm.weights[hover.t], 2)}</span></span>
          : <span className="text-[var(--paper-soft)]">Hover a bar or a table cell for its weight.</span>}
      </div>
      <div ref={ref} className="w-full mt-1">
        <svg width={width} height={h} role="img" aria-label={`Portfolio weights by fund for ${mixes.map((m) => m.label).join(", ")}; values in the table below`}>
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={0} y2={h - 18} stroke="var(--line-dark)" />
              <text x={x(t)} y={h - 4} fontSize={11} textAnchor="middle" fill="var(--paper-soft)" className="mono">{t}%</text>
            </g>
          ))}
          {tickers.map((t, i) => (
            <g key={t}>
              <text x={0} y={i * group + (mixes.length * (barH + inner)) / 2 + 4} fontSize={13} fill="var(--paper)" className="mono">{t}</text>
              {mixes.map((m, j) => {
                const v = m.weights[t] ?? 0;
                const y = i * group + j * (barH + inner);
                const active = hover?.t === t && hover.m === m.key;
                return (
                  <g key={m.key} onMouseEnter={() => setHover({ t, m: m.key })} onMouseLeave={() => setHover(null)}>
                    <rect x={labelW} y={y - 1} width={plotW} height={barH + 2} fill="transparent" />
                    <rect x={labelW} y={y} width={Math.max(1, x(v) - labelW)} height={barH} fill={m.color} opacity={hover && !active ? 0.45 : 1} />
                    <text x={x(v) + 4} y={y + barH - 2} fontSize={11} fill="var(--paper)" className="mono">{p(m.weights[t], 1)}</text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      <div className="overflow-x-auto mt-2" tabIndex={0} role="region" aria-label="Weights and statistics by mix">
        <table className="w-full small">
          <caption className="sr-only">Weights, expected return, risk and Sharpe for each mix (trailing 1-year window)</caption>
          <thead><tr>
            <th scope="col" className={thCls}>Mix</th>
            {tickers.map((t) => <th key={t} scope="col" className={`${thCls} text-right`}>{t}</th>)}
            <th scope="col" className={`${thCls} text-right`}>Return</th><th scope="col" className={`${thCls} text-right`}>Risk</th><th scope="col" className={`${thCls} text-right`}>Sharpe</th>
          </tr></thead>
          <tbody>
            {mixes.map((m) => (
              <tr key={m.key} style={rowStyle} className={hover?.m === m.key ? "bg-[var(--night)]" : "hover:bg-[var(--night)]"}>
                <th scope="row" className={`${tdCls} text-left font-normal`}>
                  <span className="inline-block w-2.5 h-2.5 mr-2 align-middle" style={{ background: m.color }} aria-hidden />{m.label}
                </th>
                {tickers.map((t) => (
                  <td key={t} tabIndex={0} className={`${tdCls} mono text-right`} onMouseEnter={() => setHover({ t, m: m.key })} onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover({ t, m: m.key })} onBlur={() => setHover(null)}>{p(m.weights[t], 2)}</td>
                ))}
                <td className={`${tdCls} mono text-right`}>{p(m.ret, 2)}</td>
                <td className={`${tdCls} mono text-right`}>{p(m.risk, 2)}</td>
                <td className={`${tdCls} mono text-right`}>{m.sharpe?.toFixed(3) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>Returns and risk are annualised from the trailing year of daily returns: what would have been efficient in hindsight, not a forecast. The no-cap row is not an app output; it was traced for this demo with the project&apos;s own stats function.</Note>
    </section>
  );
}

/* ---------- Suggested trades ---------- */
function Trades({ data }: { data: DemoData }) {
  const trades = arr(obj(data?.optimization).trades);
  if (!trades.length) return null;
  return (
    <section>
      <h3 className="h3 mb-2">Trades the app suggests</h3>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Suggested trades table">
        <table className="w-full small">
          <thead><tr>
            <th scope="col" className={thCls}>Fund</th><th scope="col" className={thCls}>Action</th>
            <th scope="col" className={`${thCls} text-right`}>Weight now → target</th><th scope="col" className={`${thCls} text-right`}>Dollars</th>
            <th scope="col" className={thCls}>App&apos;s reason</th>
          </tr></thead>
          <tbody>
            {trades.map((t) => {
              const d = num(t.dollars);
              return (
                <tr key={str(t.ticker)} style={rowStyle} className="hover:bg-[var(--night)] align-top">
                  <td className={`${tdCls} mono`}>{str(t.ticker, "?")}</td>
                  <td className={tdCls}>{str(t.action, "—")}</td>
                  <td className={`${tdCls} mono text-right`}>{p(num(t.current_pct), 1)} → {p(num(t.target_pct), 1)}</td>
                  <td className={`${tdCls} mono text-right ${d == null ? "" : d < 0 ? "text-[var(--neg)]" : "text-[var(--pos)]"}`}>{d == null ? "—" : `${d < 0 ? "−" : "+"}${usd(Math.abs(d), 0)}`}</td>
                  <td className="px-2 py-1.5 min-w-[220px] text-[var(--paper-soft)]">{str(t.reason, "—")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- Efficient frontier scatter ---------- */
type Pt = { id: string; group: string; ret: number; risk: number; sharpe: number | null; weights: Record<string, number | null>; label?: string };
function FrontierChart({ data, mixes }: { data: DemoData; mixes: Mix[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<string | null>(null);
  const fr = obj(data?.frontier);
  const frontier: Pt[] = arr(fr.points).flatMap((q, i) => {
    const ret = num(q.ret), risk = num(q.risk);
    return ret == null || risk == null ? [] : [{ id: `f${i}`, group: "frontier", ret, risk, sharpe: num(q.sharpe), weights: Object.fromEntries(Object.entries(obj(q.weights)).map(([k, v]) => [k, num(v)])) }];
  });
  const assets: Pt[] = arr(fr.assets).flatMap((a) => {
    const ret = num(a.ret), risk = num(a.risk);
    return ret == null || risk == null ? [] : [{ id: `a${str(a.ticker)}`, group: "asset", ret, risk, sharpe: null, weights: { [str(a.ticker)]: 100 }, label: str(a.ticker, "?") }];
  });
  const marks: Pt[] = mixes.flatMap((m) => (m.ret == null || m.risk == null ? [] : [{ id: m.key, group: m.key, ret: m.ret, risk: m.risk, sharpe: m.sharpe, weights: m.weights, label: m.label }]));
  const all = [...frontier, ...assets, ...marks];
  if (!frontier.length) return <section><h3 className="h3 mb-2">Efficient frontier</h3><Note>No frontier points were exported.</Note></section>;

  const height = width < 480 ? 260 : 340;
  const pad = { l: 46, r: 14, t: 12, b: 38 };
  const rs = all.map((q) => q.risk), es = all.map((q) => q.ret);
  const x0 = Math.floor(Math.min(...rs) / 2) * 2, x1 = Math.ceil(Math.max(...rs) / 2) * 2;
  const y0 = Math.floor(Math.min(...es) / 2) * 2, y1 = Math.ceil(Math.max(...es) / 2) * 2;
  const x = (v: number) => pad.l + ((v - x0) / (x1 - x0 || 1)) * (width - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - y0) / (y1 - y0 || 1)) * (height - pad.t - pad.b);
  const xt: number[] = []; for (let t = x0; t <= x1; t += 2) xt.push(t);
  const yt: number[] = []; for (let t = y0; t <= y1; t += 2) yt.push(t);
  const colorOf = (g: string) => (g === "frontier" ? OTHER : mixes.find((m) => m.key === g)?.color ?? "var(--paper-soft)");
  const sel = all.find((q) => q.id === active);
  const line = [...frontier].sort((a, b) => a.risk - b.risk).map((q, i) => `${i ? "L" : "M"}${x(q.risk).toFixed(1)},${y(q.ret).toFixed(1)}`).join("");
  const keyNav = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const i = all.findIndex((q) => q.id === active);
    const n = e.key === "ArrowRight" ? (i + 1) % all.length : (i <= 0 ? all.length - 1 : i - 1);
    setActive(all[n].id);
  };
  const w = fr.window ? obj(fr.window) : {};
  const wfmt = (o: Record<string, number | null>) => Object.entries(o).map(([k, v]) => `${k} ${p(v, 1)}`).join(" · ");

  return (
    <section>
      <h3 className="h3 mb-2">Efficient frontier</h3>
      <div className="small min-h-[3em]" aria-live="polite">
        {sel ? (
          <span>
            <span className="text-[var(--paper-soft)]">{sel.group === "frontier" ? "Frontier point" : sel.group === "asset" ? "Single fund" : sel.label}:</span>{" "}
            return <span className="mono">{p(sel.ret, 2)}</span> · risk <span className="mono">{p(sel.risk, 2)}</span>
            {sel.sharpe != null && <> · Sharpe <span className="mono">{sel.sharpe.toFixed(3)}</span></>}
            <br /><span className="mono text-[var(--paper-soft)]">{wfmt(sel.weights)}</span>
          </span>
        ) : <span className="text-[var(--paper-soft)]">Hover a point for its return, risk and weights. With the chart focused, ← / → step through points.</span>}
      </div>
      <div ref={ref} className="w-full">
        <svg width={width} height={height} role="img" tabIndex={0} onKeyDown={keyNav} onBlur={() => setActive(null)}
          aria-label={`Risk versus annual return. ${frontier.length} frontier points; ${marks.map((m) => `${m.label} at risk ${p(m.risk, 1)}, return ${p(m.ret, 1)}`).join("; ")}`}>
          {xt.map((t) => <g key={`x${t}`}><line x1={x(t)} x2={x(t)} y1={pad.t} y2={height - pad.b} stroke="var(--line-dark)" /><text x={x(t)} y={height - pad.b + 14} fontSize={11} textAnchor="middle" fill="var(--paper-soft)" className="mono">{t}%</text></g>)}
          {yt.map((t) => <g key={`y${t}`}><line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line-dark)" strokeWidth={t === 0 ? 1.5 : 1} /><text x={pad.l - 6} y={y(t) + 4} fontSize={11} textAnchor="end" fill="var(--paper-soft)" className="mono">{t}%</text></g>)}
          <text x={(pad.l + width - pad.r) / 2} y={height - 4} fontSize={11} textAnchor="middle" fill="var(--paper-soft)">Risk (annualised volatility)</text>
          <text x={pad.l} y={pad.t - 2} fontSize={11} fill="var(--paper-soft)">Return ↑</text>
          <path d={line} fill="none" stroke={OTHER} strokeWidth={1.5} />
          {all.map((q) => {
            const isMark = q.group !== "frontier" && q.group !== "asset";
            const on = active === q.id;
            const cx = x(q.risk), cy = y(q.ret);
            return (
              <g key={q.id} onMouseEnter={() => setActive(q.id)} onMouseLeave={() => setActive(null)}>
                <circle cx={cx} cy={cy} r={10} fill="transparent" />
                {q.group === "asset" ? (
                  <>
                    <rect x={cx - 4} y={cy - 4} width={8} height={8} fill="none" stroke="var(--paper)" strokeWidth={on ? 2 : 1.25} />
                    <text x={cx + 7} y={cy - 6} fontSize={11} fill="var(--paper)" className="mono">{q.label}</text>
                  </>
                ) : (
                  <circle cx={cx} cy={cy} r={isMark ? (on ? 8 : 6.5) : on ? 5 : 3} fill={colorOf(q.group)} stroke={isMark ? "var(--paper)" : "none"} strokeWidth={1.5} />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 small mt-2" aria-label="Legend">
        <li><span className="inline-block w-2.5 h-2.5 mr-1.5 align-middle rounded-full" style={{ background: OTHER }} aria-hidden />Frontier ({frontier.length} points, no cap)</li>
        {marks.map((m) => (
          <li key={m.id}>
            <span className="inline-block w-2.5 h-2.5 mr-1.5 align-middle rounded-full" style={{ background: colorOf(m.group) }} aria-hidden />
            {m.label} <span className="mono text-[var(--paper-soft)]">{p(m.risk, 1)} / {p(m.ret, 1)}</span>
          </li>
        ))}
        {assets.length > 0 && <li><span className="inline-block w-2.5 h-2.5 mr-1.5 align-middle" style={{ border: "1px solid var(--paper)" }} aria-hidden />Single funds ({assets.map((a) => a.label).join(", ")})</li>}
      </ul>
      <Note>
        The app has no frontier view. This curve was traced for the demo with the project&apos;s own stats function over {str(w.start, "?")} → {str(w.end, "?")}, long-only and fully invested,
        without the app&apos;s per-name cap. Hover the points to compare the capped app result with the uncapped curve.
      </Note>
    </section>
  );
}
