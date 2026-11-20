"use client";
/**
 * Equity Desk demo (MSFT): the report-style view of one recorded run — brief, valuation
 * football field vs the quote, DCF scenarios and WACC, SWOT, risks, financial exhibits
 * and data audit. Every figure comes from demo-data/equity-desk/data.json.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DemoData } from "./Demo";
import { Tabs, Stat, pct, usd, big, signedPct, tone, SERIES } from "./ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const TXT = "text-[17px]! leading-snug [overflow-wrap:anywhere]";
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : v == null ? d : String(v));
const arr = <T = Any,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const obj = (v: unknown): Record<string, Any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, Any>) : {});

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

const Bullets = ({ items, soft }: { items: string[]; soft?: boolean }) => items.length ? (
  <ul className={`space-y-1 small ${soft ? "text-[var(--paper-soft)]" : ""}`}>
    {items.map((x, i) => <li key={i} className="pl-4 relative max-w-[80ch]"><span aria-hidden className="absolute left-0 text-[var(--paper-soft)]">–</span>{x}</li>)}
  </ul>
) : null;

const H = ({ children }: { children: ReactNode }) => <h3 className="label text-[var(--paper-soft)] mb-2 mt-1">{children}</h3>;
const panel = { background: "var(--night)", border: "1px solid var(--line-dark)" };

/* ---------- Brief ---------- */
function Brief({ d }: { d: DemoData }) {
  const b = obj(d.executiveBrief);
  const c = obj(b.company);
  const pillars = arr(b.thesisPillars).map(obj);
  const debates = arr(b.keyDebates).map(obj);
  const findings = arr(obj(d.attention).findings).map(obj).slice(0, 5);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        <Stat label="Quote" value={usd(num(c.current_price))} sub={big(num(c.market_cap))} />
        <Stat cls={TXT} label="Research posture" value={str(b.researchPosture, "—")} sub={`evidence confidence ${str(b.evidenceConfidence, "—")}`} />
        <Stat cls={TXT} label="Latest fiscal period" value={str(b.latestFinancialPeriod, "—")} sub={`completeness ${pct(num(b.statementCompleteness), 0)}`} />
        <Stat cls={TXT} label="Industry" value={str(c.industry, "—")} sub={str(c.sector) || undefined} />
      </div>
      {str(b.underwritingStatus) && <p className="small text-[var(--paper-soft)]">Status: {str(b.underwritingStatus)}</p>}
      {str(b.centralQuestion) && <div><H>CENTRAL QUESTION</H><p className="text-[20px] leading-snug max-w-[60ch]">{str(b.centralQuestion)}</p></div>}
      {str(b.mdPmAnswer) && <p className="max-w-[72ch] p-4" style={{ ...panel, borderLeft: "3px solid var(--paper-soft)" }}>{str(b.mdPmAnswer)}</p>}
      {pillars.length > 0 && (
        <div>
          <H>THESIS PILLARS</H>
          <div className="grid md:grid-cols-2 gap-px" style={{ background: "var(--line-dark)" }}>
            {pillars.map((p, i) => (
              <div key={i} className="p-4" style={{ background: "var(--night)" }}>
                <p className="font-medium">{str(p.title)}</p>
                <p className="small text-[var(--paper-soft)] mt-1">{str(p.claim)}</p>
                <Bullets items={arr(p.evidence).map((x) => str(x))} />
                {str(p.disconfirming_signal) && <p className="small mt-2"><span className="text-[var(--paper-soft)]">Disconfirming signal: </span>{str(p.disconfirming_signal)}</p>}
                <p className="small text-[var(--paper-soft)] mt-2 mono">{str(p.evidence_label)} · confidence {str(p.confidence, "—")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {debates.length > 0 && (
        <div>
          <H>KEY DEBATES</H>
          <div className="overflow-x-auto" style={{ border: "1px solid var(--line-dark)" }}>
            <table className="w-full small min-w-[560px]">
              <thead><tr className="text-[var(--paper-soft)]">{["Debate", "Consensus", "Analyst view", "What changes the view", "Next catalyst"].map((h) => <th key={h} scope="col" className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>{debates.map((x, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--line-dark)" }}>
                  <th scope="row" className="px-3 py-2 text-left font-normal align-top">{str(x.debate)}</th>
                  <td className="px-3 py-2 align-top">{str(x.consensus_view, "—")}</td>
                  <td className="px-3 py-2 align-top">{str(x.analyst_view, "—")}</td>
                  <td className="px-3 py-2 align-top">{str(x.what_changes_the_view, "—")}</td>
                  <td className="px-3 py-2 align-top mono">{str(x.next_catalyst, "—")}</td>
                </tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
      {findings.length > 0 && (
        <div>
          <H>TOP REVIEW PRIORITIES</H>
          <ol className="space-y-2">
            {findings.map((f, i) => (
              <li key={i} className="p-3 flex gap-3" style={panel}>
                <span className="mono text-[var(--paper-soft)] shrink-0">#{num(f.rank) ?? i + 1}</span>
                <div className="min-w-0">
                  <p>{str(f.headline)} <span className="small text-[var(--paper-soft)]">· {str(f.topic)} · score <span className="mono">{num(f.score) ?? "—"}/50</span></span></p>
                  <p className="small text-[var(--paper-soft)]">{str(f.next_action || f.detail)}</p>
                </div>
              </li>
            ))}
          </ol>
          {str(obj(d.attention).method) && <p className="small text-[var(--paper-soft)] mt-2">{str(obj(d.attention).method)}</p>}
        </div>
      )}
    </div>
  );
}

/* ---------- Valuation football field ---------- */
type Range = { label: string; low: number; high: number; base: number | null; group: 0 | 1; review: boolean; upside: number | null };

function FootballField({ rows, quote, envLow, envHigh }: { rows: Range[]; quote: number | null; envLow: number | null; envHigh: number | null }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const labelW = w < 480 ? 108 : 150, padR = 20, rowH = 34, top = 24, axisH = 26;
  const plotW = Math.max(60, w - labelW - padR);
  const maxV = Math.max(quote ?? 0, envHigh ?? 0, ...rows.map((r) => r.high));
  const stepV = maxV > 400 ? 100 : 50;
  const axisMax = Math.ceil((maxV * 1.04) / stepV) * stepV;
  const x = (v: number) => labelW + (v / axisMax) * plotW;
  const h = top + rows.length * rowH + axisH;
  const ticks: number[] = [];
  for (let t = 0; t <= axisMax; t += stepV) ticks.push(t);
  const hv = hover != null ? rows[hover] : null;
  return (
    <div>
      <p className="small text-[var(--paper-soft)] min-h-[1.45em]" aria-live="polite">
        {hv ? <><span className="text-[var(--paper)]">{hv.label}</span>: <span className="mono">{hv.low === hv.high ? usd(hv.low) : `${usd(hv.low)}–${usd(hv.high)}`}</span>{hv.base != null && hv.low !== hv.high ? <> (mid <span className="mono">{usd(hv.base)}</span>)</> : null}{hv.upside != null ? <> · <span className="mono">{signedPct(hv.upside)}</span> vs quote</> : null}{hv.review ? " · review required" : ""}</> : "Hover a bar for its range."}
      </p>
      <div ref={ref}>
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block" role="img" aria-label={`Valuation ranges by method on one dollar axis: ${rows.map((r) => `${r.label} ${r.low === r.high ? usd(r.low) : `${usd(r.low)} to ${usd(r.high)}`}`).join("; ")}${quote != null ? `; quote ${usd(quote)}` : ""}.`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={top - 4} y2={top + rows.length * rowH} stroke="var(--line-dark)" />
              <text x={x(t)} y={h - 8} fontSize={11} fill="var(--paper-soft)" textAnchor="middle" className="mono">${t}</text>
            </g>
          ))}
          {envLow != null && envHigh != null && (
            <g>
              <rect x={x(envLow)} y={top - 4} width={x(envHigh) - x(envLow)} height={rows.length * rowH + 4} fill="var(--paper)" opacity={0.05} />
              <text x={x(envLow)} y={top - 9} fontSize={10.5} fill="var(--paper-soft)">cross-method envelope {usd(envLow)}–{usd(envHigh)}</text>
            </g>
          )}
          {rows.map((r, i) => {
            const y = top + i * rowH;
            const single = r.high - r.low < 0.01;
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={0} y={y} width={w} height={rowH} fill="transparent" />
                <text x={labelW - 8} y={y + rowH / 2 + 4} fontSize={11.5} textAnchor="end" fill="var(--paper-soft)">{r.label}</text>
                {single
                  ? <rect x={x(r.low) - 3} y={y + 7} width={6} height={rowH - 14} fill={SERIES[r.group]} opacity={hover === i ? 1 : 0.9} />
                  : <rect x={x(r.low)} y={y + 9} width={Math.max(2, x(r.high) - x(r.low))} height={rowH - 18} fill={SERIES[r.group]} opacity={hover === i ? 1 : 0.85} />}
                {!single && r.base != null && <line x1={x(r.base)} x2={x(r.base)} y1={y + 6} y2={y + rowH - 6} stroke="var(--paper)" strokeWidth={2} />}
                <title>{`${r.label}: ${single ? usd(r.low) : `${usd(r.low)}–${usd(r.high)}`}`}</title>
              </g>
            );
          })}
          {quote != null && (
            <g>
              <line x1={x(quote)} x2={x(quote)} y1={top - 4} y2={top + rows.length * rowH} stroke="var(--paper)" strokeWidth={2} strokeDasharray="4 3" />
              <text x={x(quote) + 4} y={top + rows.length * rowH - 4} fontSize={11} fill="var(--paper)" className="mono" textAnchor={x(quote) > w - 110 ? "end" : "start"} dx={x(quote) > w - 110 ? -8 : 0}>quote {usd(quote)}</text>
            </g>
          )}
        </svg>
      </div>
      <div className="flex flex-wrap gap-4 small text-[var(--paper-soft)] mt-1">
        <span className="inline-flex items-center gap-2"><i className="inline-block w-3 h-3" style={{ background: SERIES[0] }} />DCF scenario (point value)</span>
        <span className="inline-flex items-center gap-2"><i className="inline-block w-3 h-3" style={{ background: SERIES[1] }} />Peer quartiles (low–high, tick = median)</span>
        <span className="inline-flex items-center gap-2"><i className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: "var(--paper)" }} />Stored quote</span>
      </div>
    </div>
  );
}

const methodLabel = (m: string) => m.replace(/^Peers\s+/, "Peers ").replace("ev_revenue", "EV/Revenue").replace("ev_ebitda", "EV/EBITDA").replace(/\bpe\b/, "P/E");

function Valuation({ d }: { d: DemoData }) {
  const v = obj(d.valuation);
  const quote = num(v.quote) ?? num(obj(obj(d.executiveBrief).company).current_price);
  const rows: Range[] = arr(v.methodComparison).map(obj).flatMap((m) => {
    const lo = num(m.value_low), hi = num(m.value_high), base = num(m.value_base);
    if (lo == null && hi == null && base == null) return [];
    const L = lo ?? base ?? hi!, Hh = hi ?? base ?? lo!;
    return [{ label: methodLabel(str(m.method)), low: Math.min(L, Hh), high: Math.max(L, Hh), base, group: /dcf/i.test(str(m.method)) ? 0 : 1, review: m.review_required === true, upside: num(m.upside_downside) } as Range];
  });
  const rev = obj(v.reverseDcf);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        <Stat label="Stored quote" value={usd(quote)} />
        <Stat cls={TXT} label="Cross-method range" value={num(v.rangeLow) != null && num(v.rangeHigh) != null ? `${usd(num(v.rangeLow), 0)}–${usd(num(v.rangeHigh), 0)}` : "—"} sub="an envelope, not a target" />
        <Stat cls={TXT} label="Framework" value={str(v.framework, "—")} sub={`confidence ${str(v.confidence, "—")}`} />
        <Stat label="Reverse DCF" value={pct(num(rev.implied_starting_growth))} sub="starting growth implied by the quote" />
      </div>
      {rows.length > 0 && <FootballField rows={rows} quote={quote} envLow={num(v.rangeLow)} envHigh={num(v.rangeHigh)} />}
      {rows.length > 0 && (
        <div className="overflow-x-auto" style={{ border: "1px solid var(--line-dark)" }}>
          <table className="w-full small min-w-[520px]">
            <thead><tr className="text-[var(--paper-soft)]">{["Method", "Low", "Mid", "High", "Mid vs quote", "Flag"].map((h, j) => <th key={h} scope="col" className={`px-3 py-2 font-medium ${j && j < 5 ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--line-dark)" }}>
                <th scope="row" className="px-3 py-2 text-left font-normal">{r.label}</th>
                <td className="px-3 py-2 text-right mono">{usd(r.low)}</td>
                <td className="px-3 py-2 text-right mono">{usd(r.base)}</td>
                <td className="px-3 py-2 text-right mono">{usd(r.high)}</td>
                <td className={`px-3 py-2 text-right mono ${tone(r.upside)}`}>{signedPct(r.upside)}</td>
                <td className="px-3 py-2">{r.review ? "review required" : "—"}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      <div><H>INTERPRETATION</H><Bullets items={arr(v.interpretation).map((x) => str(x))} /></div>
      {str(rev.interpretation) && <p className="small text-[var(--paper-soft)] max-w-[80ch]">Reverse DCF: {str(rev.interpretation)}</p>}
    </div>
  );
}

/* ---------- Scenarios & WACC ---------- */
function Scenarios({ d }: { d: DemoData }) {
  const v = obj(d.valuation);
  const quote = num(v.quote);
  const sc = arr(v.dcfScenarios).map(obj);
  const w = obj(v.wacc);
  const sens = obj(v.sensitivity);
  const wv = arr<number>(sens.wacc_values), gv = arr<number>(sens.terminal_growth_values), grid = arr<number[]>(sens.implied_values_per_share);
  const baseW = num(w.wacc);
  return (
    <div className="space-y-6">
      {sc.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-px" style={{ background: "var(--line-dark)" }}>
          {sc.map((s, i) => (
            <div key={i} className="p-4" style={{ background: "var(--night)" }}>
              <p className="label text-[var(--paper-soft)] uppercase">{str(s.name)} case</p>
              <p className="mono text-[26px] mt-1">{usd(num(s.implied_value_per_share))}</p>
              <p className={`mono small ${tone(num(s.upside_downside))}`}>{signedPct(num(s.upside_downside))} vs {usd(quote)}</p>
              <dl className="mt-3 small grid grid-cols-2 gap-y-1">
                <dt className="text-[var(--paper-soft)]">Growth</dt><dd className="mono text-right">{pct(num(s.revenue_growth_start))} → {pct(num(s.revenue_growth_end))}</dd>
                <dt className="text-[var(--paper-soft)]">EBIT margin</dt><dd className="mono text-right">{pct(num(s.target_ebit_margin))}</dd>
                <dt className="text-[var(--paper-soft)]">WACC</dt><dd className="mono text-right">{pct(num(s.wacc))}</dd>
                <dt className="text-[var(--paper-soft)]">Terminal g</dt><dd className="mono text-right">{pct(num(s.terminal_growth_rate))}</dd>
              </dl>
            </div>
          ))}
        </div>
      )}
      <p className="small text-[var(--paper-soft)]">Conditional valuation scenarios; the run assigns no probabilities.</p>
      {Object.keys(w).length > 0 && (
        <div>
          <H>WACC INPUTS</H>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
            <Stat label="Risk-free rate" value={pct(num(w.risk_free_rate), 2)} />
            <Stat label="Equity risk premium" value={pct(num(w.equity_risk_premium), 2)} />
            <Stat label="Beta" value={num(w.beta)?.toFixed(3) ?? "—"} />
            <Stat label="Cost of equity" value={pct(num(w.cost_of_equity), 2)} />
            <Stat label="Pre-tax cost of debt" value={pct(num(w.pre_tax_cost_of_debt), 2)} />
            <Stat label="Marginal tax" value={pct(num(w.marginal_tax_rate), 0)} />
            <Stat cls={TXT} label="Weights E / D" value={`${pct(num(w.equity_weight))} / ${pct(num(w.debt_weight))}`} sub={`${big(num(w.market_value_equity))} / ${big(num(w.market_value_debt))}`} />
            <Stat label="WACC" value={pct(num(w.wacc), 2)} />
          </div>
          <Bullets soft items={Object.entries(obj(w.sources)).map(([k, s]) => `${k}: ${str(s)}`)} />
        </div>
      )}
      {wv.length > 0 && gv.length > 0 && grid.length > 0 && (
        <div>
          <H>BASE-CASE SENSITIVITY · VALUE PER SHARE</H>
          <div className="overflow-x-auto relative" style={{ border: "1px solid var(--line-dark)" }}>
            <table className="small min-w-[460px] w-full">
              <thead><tr className="text-[var(--paper-soft)]"><th scope="col" className="px-3 py-2 text-left font-medium">WACC ↓ / terminal g →</th>{gv.map((g, j) => <th key={j} scope="col" className="px-3 py-2 text-right font-medium mono">{pct(g)}</th>)}</tr></thead>
              <tbody>{wv.map((wr, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--line-dark)" }}>
                  <th scope="row" className="px-3 py-2 text-left font-normal mono">{pct(wr)}</th>
                  {arr<number>(grid[i]).map((val, j) => {
                    const isBase = baseW != null && Math.abs(wr - baseW) < 1e-6 && j === Math.floor(gv.length / 2);
                    return <td key={j} className="px-3 py-2 text-right mono" style={isBase ? { outline: "1px solid var(--paper)", outlineOffset: -1 } : undefined}>{usd(num(val), 0)}{isBase && <span className="sr-only"> (base)</span>}</td>;
                  })}
                </tr>))}</tbody>
            </table>
          </div>
          <p className="small text-[var(--paper-soft)] mt-1">Outlined cell: base WACC and terminal growth.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- SWOT ---------- */
function Swot({ d }: { d: DemoData }) {
  const s = obj(d.swot);
  const quads: [string, string][] = [["strengths", "Strengths"], ["weaknesses", "Weaknesses"], ["opportunities", "Opportunities"], ["threats", "Threats"]];
  return (
    <div className="space-y-4">
      <p className="small text-[var(--paper-soft)]">Status: {str(s.status, "—")}. Strengths and weaknesses are internal observations; opportunities and threats are hypotheses to verify.</p>
      <div className="grid md:grid-cols-2 gap-px" style={{ background: "var(--line-dark)" }}>
        {quads.map(([k, label]) => {
          const items = arr(s[k]).map(obj);
          return (
            <section key={k} className="p-4" style={{ background: "var(--night)" }} aria-label={label}>
              <h3 className="font-medium">{label} <span className="mono small text-[var(--paper-soft)]">· {items.length}</span></h3>
              {items.length ? (
                <ul className="mt-3 space-y-3">
                  {items.map((it, i) => (
                    <li key={i}>
                      <p className="small font-medium">{str(it.title)}</p>
                      <p className="small text-[var(--paper-soft)]">{str(it.claim)}</p>
                      <p className="small text-[var(--paper-soft)] mono mt-0.5">{str(it.evidence_kind)} · {str(it.confidence, "—")}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="small text-[var(--paper-soft)] mt-3">None recorded. The run leaves this quadrant empty rather than filling it with guesses.</p>}
            </section>
          );
        })}
      </div>
      <Bullets soft items={arr(s.limitations).map((x) => str(x))} />
    </div>
  );
}

/* ---------- Risks ---------- */
function Risks({ d }: { d: DemoData }) {
  const r = obj(d.risks);
  const reg = arr(r.register).map(obj);
  const sevs = Array.from(new Set(reg.map((x) => str(x.severity, "unscored"))));
  const [sev, setSev] = useState("all");
  const [all, setAll] = useState(false);
  const filtered = reg.filter((x) => sev === "all" || str(x.severity, "unscored") === sev);
  const shown = all ? filtered : filtered.slice(0, 8);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        <Stat label="Annualised volatility" value={pct(num(r.annualizedVolatility))} />
        <Stat label="Max drawdown (1y)" value={pct(num(r.maxDrawdown1y))} cls={tone(num(r.maxDrawdown1y))} />
        <Stat label="Beta" value={num(r.beta)?.toFixed(3) ?? "—"} />
        <Stat cls={TXT} label="Next earnings" value={str(r.nextEarnings, "—")} />
      </div>
      <Bullets soft items={arr(r.flags).map((x) => str(x))} />
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
          <H>RISK REGISTER · {filtered.length} OF {reg.length}</H>
          <label className="small text-[var(--paper-soft)] flex flex-col gap-1">
            Severity
            <select value={sev} onChange={(e) => { setSev(e.target.value); setAll(false); }} className="h-10 px-2 small" style={{ background: "var(--night)", color: "var(--paper)", border: "1px solid var(--line-dark)" }}>
              <option value="all">All</option>
              {sevs.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto" style={{ border: "1px solid var(--line-dark)" }}>
          <table className="w-full small min-w-[640px]">
            <thead><tr className="text-[var(--paper-soft)]">{["Risk", "Category", "Severity", "Evidence", "What to watch"].map((h) => <th key={h} scope="col" className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{shown.map((x, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--line-dark)" }}>
                <th scope="row" className="px-3 py-2 text-left font-normal align-top">{str(x.risk)}</th>
                <td className="px-3 py-2 align-top">{str(x.category, "—")}</td>
                <td className="px-3 py-2 align-top">{str(x.severity, "—")}</td>
                <td className="px-3 py-2 align-top">{str(x.evidence, "—")}</td>
                <td className="px-3 py-2 align-top text-[var(--paper-soft)]">{str(x.what_to_watch, "—")}</td>
              </tr>))}</tbody>
          </table>
        </div>
        {filtered.length > 8 && <button type="button" className="btn btn-quiet mt-2" onClick={() => setAll((a) => !a)} aria-expanded={all}>{all ? "Show fewer" : `Show all ${filtered.length}`} →</button>}
      </div>
      {arr(r.falsifiers).length > 0 && <div><H>WHAT WOULD FALSIFY THE VIEW</H><Bullets items={arr(r.falsifiers).map((x) => str(x))} /></div>}
      {obj(obj(r.news).coverage).requested != null && (
        <p className="small text-[var(--paper-soft)]">News: {num(obj(obj(r.news).coverage).returned) ?? 0} of {num(obj(obj(r.news).coverage).requested)} requested items returned in this run.</p>
      )}
    </div>
  );
}

/* ---------- Financial exhibits ---------- */
const COLS: Record<string, [string, "usd" | "pct" | "eps" | "text"]> = {
  fiscalYear: ["Fiscal year", "text"], periodEnd: ["Period end", "text"], revenue: ["Revenue", "usd"], revenueGrowth: ["Growth", "pct"],
  grossMargin: ["Gross margin", "pct"], operatingMargin: ["Op. margin", "pct"], dilutedEps: ["Diluted EPS", "eps"],
  operatingCashFlow: ["Op. cash flow", "usd"], capex: ["Capex", "usd"], freeCashFlow: ["Free cash flow", "usd"],
};
const fmt = (v: Any, k: "usd" | "pct" | "eps" | "text") => k === "usd" ? big(num(v)) : k === "pct" ? pct(num(v)) : k === "eps" ? usd(num(v)) : str(v, "—");

function Financials({ d }: { d: DemoData }) {
  const f = obj(d.financialExhibits);
  const a = obj(f.annual);
  const cols = arr<string>(a.columns);
  const rows = arr<Any[]>(a.rows);
  const bs = obj(f.balanceSheetLatest), cf = obj(f.cashFlowLatest);
  return (
    <div className="space-y-6">
      {cols.length > 0 && (
        <div className="overflow-x-auto" style={{ border: "1px solid var(--line-dark)" }}>
          <table className="w-full small min-w-[820px]">
            <caption className="text-left px-3 pt-3 pb-1 font-medium">Annual exhibits ({str(f.currency, "USD")})</caption>
            <thead><tr className="text-[var(--paper-soft)]">{cols.map((c, j) => <th key={c} scope="col" className={`px-3 py-2 font-medium ${j > 1 ? "text-right" : "text-left"}`}>{COLS[c]?.[0] ?? c}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--line-dark)" }}>
                {cols.map((c, j) => j === 0
                  ? <th key={c} scope="row" className="px-3 py-2 text-left font-normal mono">{str(arr(r)[j], "—")}</th>
                  : <td key={c} className={`px-3 py-2 mono ${j > 1 ? "text-right" : ""}`}>{fmt(arr(r)[j], COLS[c]?.[1] ?? "text")}</td>)}
              </tr>))}</tbody>
          </table>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <H>BALANCE SHEET · LATEST</H>
          <div className="grid grid-cols-2 gap-px" style={{ background: "var(--line-dark)" }}>
            <Stat label="Cash" value={big(num(bs.cash))} />
            <Stat label="Total debt" value={big(num(bs.total_debt))} />
            <Stat label="Net debt" value={big(num(bs.net_debt))} />
            <Stat label="Equity" value={big(num(bs.stockholders_equity))} />
            <Stat label="Current ratio" value={num(bs.current_ratio)?.toFixed(2) ?? "—"} />
            <Stat label="Debt / equity" value={num(bs.debt_to_equity)?.toFixed(2) ?? "—"} />
          </div>
        </div>
        <div>
          <H>CASH FLOW · LATEST</H>
          <div className="grid grid-cols-2 gap-px" style={{ background: "var(--line-dark)" }}>
            <Stat label="Operating cash flow" value={big(num(cf.operating_cash_flow))} />
            <Stat label="Capex" value={big(num(cf.capital_expenditures))} />
            <Stat label="Free cash flow" value={big(num(cf.free_cash_flow))} />
            <Stat label="Buybacks" value={big(num(cf.share_repurchases))} />
            <Stat label="Dividends" value={big(num(cf.dividends_paid))} />
            <Stat label="Debt repaid" value={big(num(cf.debt_repaid))} />
          </div>
        </div>
      </div>
      {arr(f.trends).length > 0 && <div><H>TRENDS THE RUN DETECTED</H><Bullets items={arr(f.trends).map((x) => str(x))} /></div>}
    </div>
  );
}

/* ---------- Data audit ---------- */
function Audit({ d }: { d: DemoData }) {
  const sl = obj(d.sourcesLimitations);
  const a = obj(sl.dataAudit);
  const sd = obj(sl.systemDiagnostics);
  const fr = obj(sl.finalReport);
  const checks = Object.entries(obj(a.validation_checks));
  const agents = arr(sd.agents).map(obj);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        <Stat cls={TXT} label="Audit status" value={str(a.status, "—")} />
        <Stat label="Completeness" value={pct(num(a.completeness_score), 0)} sub={`${num(a.periods_available) ?? "—"} fiscal years`} />
        <Stat label="Bridge checks" value={`${checks.filter(([, v]) => v === true).length}/${checks.length} pass`} />
        <Stat cls={TXT} label="Report readiness" value={str(fr.readiness, "—")} sub={`${num(fr.section_count) ?? "—"} sections · v${str(fr.report_version, "—")}`} />
      </div>
      {checks.length > 0 && (
        <ul className="flex flex-wrap gap-2">{checks.map(([k, v]) => <li key={k} className="small px-2 py-1" style={{ border: `1px solid ${v === true ? "var(--pos)" : "var(--neg)"}` }}>{k.replace(/_/g, " ")}: {v === true ? "pass" : "fail"}</li>)}</ul>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <H>SOURCE PRIORITY</H>
          <ol className="small space-y-1 list-decimal pl-5">{arr(a.source_priority).map((x, i) => <li key={i}>{str(x)}</li>)}</ol>
        </div>
        <div><H>AUDIT DIAGNOSTICS</H><Bullets items={arr(a.diagnostics).map((x) => str(x))} /></div>
      </div>
      {agents.length > 0 && (
        <div>
          <H>SYSTEM DIAGNOSTICS · {num(sd.healthy_agents) ?? "—"} OK · {num(sd.degraded_agents) ?? "—"} DEGRADED · {num(sd.failed_agents) ?? "—"} FAILED</H>
          <div className="overflow-x-auto" style={{ border: "1px solid var(--line-dark)" }}>
            <table className="w-full small min-w-[520px]">
              <thead><tr className="text-[var(--paper-soft)]">{["Agent", "Status", "Summary"].map((h) => <th key={h} scope="col" className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>{agents.map((g, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--line-dark)" }}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">{str(g.agent)}</th>
                  <td className={`px-3 py-2 ${str(g.status) === "ok" ? "text-[var(--pos)]" : "text-[var(--neg)]"}`}>{str(g.status, "—")}</td>
                  <td className="px-3 py-2 text-[var(--paper-soft)]">{str(g.summary, "—")}</td>
                </tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
      {arr(fr.warnings).length > 0 && <div><H>REPORT WARNINGS</H><Bullets soft items={arr(fr.warnings).map((x) => str(x))} /></div>}
      {arr(sl.openQuestions).length > 0 && <div><H>OPEN QUESTIONS</H><Bullets items={arr(sl.openQuestions).map((x) => str(x))} /></div>}
    </div>
  );
}

type View = "brief" | "valuation" | "scenarios" | "swot" | "risks" | "financials" | "audit";
const VIEWS: [View, string][] = [["brief", "Brief"], ["valuation", "Valuation"], ["scenarios", "DCF & WACC"], ["swot", "SWOT"], ["risks", "Risks"], ["financials", "Financials"], ["audit", "Data audit"]];

export default function EquityDeskDemo({ data }: { data: DemoData }) {
  const d = data ?? {};
  const [view, setView] = useState<View>("brief");
  const c = obj(obj(d.executiveBrief).company);
  return (
    <div className="space-y-6 min-w-0">
      <div>
        <p className="label text-[var(--paper-soft)]">RESEARCH REPORT{str(obj(d.executiveBrief).preparedDate) ? ` · PREPARED ${str(obj(d.executiveBrief).preparedDate)}` : ""}</p>
        <p className="text-[22px] font-medium"><span className="mono">{str(d.ticker || c.ticker, "—")}</span> <span className="text-[var(--paper-soft)] text-[17px]">{str(c.company_name)}</span></p>
      </div>
      <Tabs label="Report section" value={view} onChange={setView} options={VIEWS} />
      <div role="tabpanel" aria-label={VIEWS.find(([v]) => v === view)?.[1]}>
        {view === "brief" && <Brief d={d} />}
        {view === "valuation" && <Valuation d={d} />}
        {view === "scenarios" && <Scenarios d={d} />}
        {view === "swot" && <Swot d={d} />}
        {view === "risks" && <Risks d={d} />}
        {view === "financials" && <Financials d={d} />}
        {view === "audit" && <Audit d={d} />}
      </div>
    </div>
  );
}
