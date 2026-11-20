"use client";
/**
 * Stock multi-agent demo: step through the 18 timed agent calls of a recorded AMD run,
 * see the valuation summary against the quote, then read the generated report.
 * Every figure comes from demo-data/stock-multi-agent/data.json.
 */
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { DemoData } from "./Demo";
import { Tabs, Stat, pct, usd, big, signedPct, SERIES } from "./ui";

/* ---------- defensive readers ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const TXT = "text-[17px]! leading-snug [overflow-wrap:anywhere]";
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : v == null ? d : String(v));
const arr = <T = Any,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const obj = (v: unknown): Record<string, Any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, Any>) : {});
const secs = (v: number | null) => (v == null ? "—" : `${v.toFixed(3)} s`);

/* ---------- hooks ---------- */
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

const RM = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const m = window.matchMedia(RM);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => (typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(RM).matches),
    () => false,
  );
}

/* ---------- tiny Markdown → React (headings, bullets, bold, code, tables, paragraphs) ---------- */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    out.push(t.startsWith("**")
      ? <strong key={`${keyBase}-${i++}`} className="font-semibold text-[var(--paper)]">{t.slice(2, -2)}</strong>
      : <code key={`${keyBase}-${i++}`} className="mono text-[13px]">{t.slice(1, -1)}</code>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isSep = (line: string) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line.trim());

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let lastHeader: string[] | null = null;
  let lastAlign: string[] = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = h[1].length, txt = inline(h[2], `h${k}`);
      const cls = lvl <= 1 ? "text-[22px] font-medium mt-2" : lvl === 2 ? "text-[20px] font-medium mt-6" : lvl === 3 ? "text-[17px] font-semibold mt-5" : "text-[15px] font-semibold mt-4 text-[var(--paper-soft)]";
      const Tag = (lvl <= 2 ? "h3" : lvl === 3 ? "h4" : "h5") as "h3" | "h4" | "h5";
      blocks.push(<Tag key={k++} className={cls}>{txt}</Tag>);
      i++; continue;
    }
    if (line.trim().startsWith("|")) {
      const group: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) group.push(lines[i++]);
      let header: string[] | null = null, align = lastAlign, body = group;
      if (group.length > 1 && isSep(group[1])) {
        header = cells(group[0]);
        align = cells(group[1]).map((c) => (c.endsWith(":") ? "right" : "left"));
        body = group.slice(2);
        lastHeader = header; lastAlign = align;
      } else header = lastHeader; // continuation rows after interleaved bullets
      const rows = body.map(cells);
      blocks.push(
        <div key={k++} className="overflow-x-auto my-3" style={{ border: "1px solid var(--line-dark)" }}>
          <table className="w-full small border-collapse min-w-[480px]">
            {header && <thead><tr>{header.map((c, j) => <th key={j} scope="col" className="px-3 py-2 font-medium text-[var(--paper-soft)]" style={{ textAlign: (align[j] as "left" | "right") ?? "left", borderBottom: "1px solid var(--line-dark)" }}>{inline(c, `th${k}${j}`)}</th>)}</tr></thead>}
            <tbody>{rows.map((r, ri) => <tr key={ri} style={{ borderTop: ri ? "1px solid var(--line-dark)" : undefined }}>{r.map((c, j) => <td key={j} className={`px-3 py-2 align-top ${align[j] === "right" ? "mono" : ""}`} style={{ textAlign: (align[j] as "left" | "right") ?? "left" }}>{inline(c, `td${k}${ri}${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: { depth: number; text: string }[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const mm = /^(\s*)[-*]\s+(.*)$/.exec(lines[i++])!;
        items.push({ depth: Math.min(2, Math.floor(mm[1].length / 2)), text: mm[2] });
      }
      blocks.push(
        <ul key={k++} className="my-2 space-y-1">
          {items.map((it, j) => <li key={j} className="relative pl-4" style={{ marginLeft: it.depth * 16 }}><span aria-hidden className="absolute left-0 text-[var(--paper-soft)]">–</span>{inline(it.text, `li${k}${j}`)}</li>)}
        </ul>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*[-*]\s+|\s*\|)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={k++} className="my-2 max-w-[72ch]">{para.map((p, j) => <span key={j}>{j > 0 && <br />}{inline(p, `p${k}${j}`)}</span>)}</p>);
  }
  return <div className="text-[15px] leading-relaxed">{blocks}</div>;
}

/* ---------- agent timeline ---------- */
type Step = { order: number; agent: string; role: string; durationSec: number | null; startOffsetSec: number | null; status: string; keyOutput: string; error: string; metrics: Record<string, Any>; issues: string[] };

function readSteps(d: DemoData): Step[] {
  return arr(d.agentSteps).map((s, idx) => {
    const o = obj(s);
    return {
      order: num(o.order) ?? idx + 1,
      agent: str(o.agent, `Agent ${idx + 1}`),
      role: str(o.role),
      durationSec: num(o.durationSec),
      startOffsetSec: num(o.startOffsetSec),
      status: str(o.status, "unknown"),
      keyOutput: str(o.keyOutput),
      error: str(o.error),
      metrics: obj(o.metrics),
      issues: arr(o.issues).map((x) => str(x)).filter(Boolean),
    };
  });
}

const short = (a: string) => a.replace(/Agent$/, "");

function Timeline({ steps, total, current, onPick }: { steps: Step[]; total: number; current: number; onPick: (i: number) => void }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const labelW = w < 480 ? 118 : 190, padR = 56, rowH = 20, top = 8, axisH = 26;
  const plotW = Math.max(60, w - labelW - padR);
  const h = top + steps.length * rowH + axisH;
  const x = (s: number) => labelW + (Math.max(0, s) / total) * plotW;
  const ticks: number[] = [];
  const stepT = total > 8 ? 2 : 1;
  for (let t = 0; t <= total + 1e-9; t += stepT) ticks.push(t);
  const shown = hover ?? current;
  const sh = steps[shown];
  const maxChars = w < 480 ? 16 : 28;
  return (
    <div>
      <p className="small text-[var(--paper-soft)] min-h-[1.45em]" aria-live="polite">
        {sh ? <><span className="text-[var(--paper)]">{String(sh.order).padStart(2, "0")} · {short(sh.agent)}</span> · starts <span className="mono">{secs(sh.startOffsetSec)}</span> · runs <span className="mono">{secs(sh.durationSec)}</span> · {sh.status}</> : null}
      </p>
      <div ref={ref} className="mt-2">
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block" role="img" aria-label={`Timeline of ${steps.length} agent calls over ${total} seconds. Longest: ${[...steps].sort((a, b) => (b.durationSec ?? 0) - (a.durationSec ?? 0)).slice(0, 3).map((s) => `${short(s.agent)} ${secs(s.durationSec)}`).join(", ")}.`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={top - 4} y2={top + steps.length * rowH} stroke="var(--line-dark)" />
              <text x={x(t)} y={h - 8} fill="var(--paper-soft)" fontSize={11} textAnchor="middle" className="mono">{t}s</text>
            </g>
          ))}
          {steps.map((s, i) => {
            const y = top + i * rowH;
            const start = s.startOffsetSec ?? 0, dur = s.durationSec ?? 0;
            const bw = Math.max(2, (dur / total) * plotW);
            const done = i <= current;
            const fill = s.status === "ok" ? SERIES[0] : SERIES[1];
            const name = short(s.agent);
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onPick(i)} style={{ cursor: "pointer" }}>
                <rect x={0} y={y} width={w} height={rowH} fill={i === current ? "var(--night)" : "transparent"} />
                <text x={labelW - 8} y={y + rowH / 2 + 4} fontSize={11.5} textAnchor="end" fill={i === current ? "var(--paper)" : "var(--paper-soft)"}>
                  {name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name}
                </text>
                <rect x={x(start)} y={y + 4} width={bw} height={rowH - 8} fill={fill} opacity={done ? 1 : 0.3} />
                <text x={x(start) + bw + 4} y={y + rowH / 2 + 4} fontSize={10.5} fill="var(--paper-soft)" className="mono">{dur >= 0.01 ? `${dur.toFixed(2)}s` : "<0.01s"}</text>
                <title>{`${name}: start ${secs(s.startOffsetSec)}, duration ${secs(s.durationSec)}, ${s.status}`}</title>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-4 small text-[var(--paper-soft)] mt-1">
        <span className="inline-flex items-center gap-2"><i className="inline-block w-3 h-3" style={{ background: SERIES[0] }} />ok · {steps.filter((s) => s.status === "ok").length}</span>
        <span className="inline-flex items-center gap-2"><i className="inline-block w-3 h-3" style={{ background: SERIES[1] }} />degraded · {steps.filter((s) => s.status !== "ok").length}</span>
        <span>Faded bars are steps not reached yet.</span>
      </div>
    </div>
  );
}

function metricText(v: Any): string {
  if (v == null) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? v.toLocaleString("en-US") : v.toFixed(3);
  if (typeof v === "string" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? "" : "s"}`;
  if (typeof v === "object") return `${Object.keys(v).length} fields`;
  return String(v);
}

function AgentRun({ d }: { d: DemoData }) {
  const steps = readSteps(d);
  const n = steps.length;
  const total = num(d.runTotalSeconds) ?? Math.max(1, ...steps.map((s) => (s.startOffsetSec ?? 0) + (s.durationSec ?? 0)));
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const atEnd = step >= n - 1;
  const isPlaying = playing && !atEnd;

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => setStep((s) => Math.min(s + 1, n - 1)), reduced ? 2600 : 1300);
    return () => window.clearInterval(id);
  }, [isPlaying, n, reduced]);

  if (!n) return <p className="text-[var(--paper-soft)]">No agent steps were recorded.</p>;
  const s = steps[Math.min(step, n - 1)];
  const go = (i: number) => { setPlaying(false); setStep(Math.max(0, Math.min(n - 1, i))); };
  const togglePlay = () => {
    if (isPlaying) return setPlaying(false);
    if (atEnd) setStep(0);
    setPlaying(true);
  };
  const metrics = Object.entries(s.metrics);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-2">
        <button type="button" className="btn h-10" onClick={() => go(step - 1)} disabled={step === 0} aria-label="Previous step" style={{ opacity: step === 0 ? 0.45 : 1 }}>← Prev</button>
        <button type="button" className="btn btn-primary h-10" onClick={togglePlay} aria-pressed={isPlaying}>{isPlaying ? "Pause" : atEnd ? "Replay" : "Play"}</button>
        <button type="button" className="btn h-10" onClick={() => go(step + 1)} disabled={atEnd} aria-label="Next step" style={{ opacity: atEnd ? 0.45 : 1 }}>Next →</button>
        <label className="small text-[var(--paper-soft)] flex flex-col gap-1 ml-auto min-w-0">
          Jump to step
          <select value={step} onChange={(e) => go(Number(e.target.value))} className="h-10 px-2 small max-w-[240px]" style={{ background: "var(--night)", color: "var(--paper)", border: "1px solid var(--line-dark)" }}>
            {steps.map((x, i) => <option key={i} value={i}>{String(x.order).padStart(2, "0")} · {short(x.agent)}</option>)}
          </select>
        </label>
      </div>
      {reduced && <p className="small text-[var(--paper-soft)]">Reduced motion is on: Play advances more slowly and nothing animates. Pause stops it at any time.</p>}

      <section aria-label={`Step ${s.order} of ${n}`} className="p-4 md:p-5" style={{ background: "var(--night)", border: "1px solid var(--line-dark)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[20px] font-medium"><span className="mono text-[var(--paper-soft)] mr-2">{String(s.order).padStart(2, "0")}/{n}</span>{s.agent}</h3>
          <span className="small px-2 py-0.5" style={{ border: `1px solid ${s.status === "ok" ? "var(--pos)" : "var(--neg)"}`, color: s.status === "ok" ? "var(--pos)" : "var(--neg)" }}>{s.status}</span>
        </div>
        {s.role && <p className="mt-2 text-[var(--paper-soft)] max-w-[68ch]">{s.role}</p>}
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-px mt-4" style={{ background: "var(--line-dark)" }}>
          <div className="p-3" style={{ background: "var(--night-2)" }}><dt className="small text-[var(--paper-soft)]">Started at</dt><dd className="mono">{secs(s.startOffsetSec)}</dd></div>
          <div className="p-3" style={{ background: "var(--night-2)" }}><dt className="small text-[var(--paper-soft)]">Duration</dt><dd className="mono">{secs(s.durationSec)}</dd></div>
          <div className="p-3 col-span-2 sm:col-span-1" style={{ background: "var(--night-2)" }}><dt className="small text-[var(--paper-soft)]">Key output</dt><dd>{s.keyOutput || "—"}</dd></div>
        </dl>
        {metrics.length > 0 && (
          <div className="mt-4">
            <h4 className="label text-[var(--paper-soft)]">METRICS</h4>
            <ul className="flex flex-wrap gap-2 mt-2">{metrics.map(([k, v]) => <li key={k} className="small px-2 py-1" style={{ border: "1px solid var(--line-dark)" }}>{k.replace(/_/g, " ")}: <span className="mono">{metricText(v)}</span></li>)}</ul>
          </div>
        )}
        {s.issues.length > 0 && (
          <div className="mt-4">
            <h4 className="label text-[var(--paper-soft)]">NOTES AND ISSUES</h4>
            <ul className="mt-2 space-y-1 small">{s.issues.map((x, j) => <li key={j} className="pl-4 relative"><span aria-hidden className="absolute left-0 text-[var(--paper-soft)]">–</span>{x}</li>)}</ul>
          </div>
        )}
        {s.error && <p className="mt-4 small text-[var(--neg)]">Error: {s.error}</p>}
      </section>

      <Timeline steps={steps} total={total} current={step} onPick={go} />
      {d.timingNote && <p className="small text-[var(--paper-soft)] max-w-[80ch]">{str(d.timingNote)}</p>}
    </div>
  );
}

/* ---------- valuation summary ---------- */
function ValueChart({ rows, quote, low, high }: { rows: { label: string; value: number; group: 0 | 1 }[]; quote: number | null; low: number | null; high: number | null }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const labelW = w < 480 ? 104 : 150, padR = 24, rowH = 30, top = 22, axisH = 26;
  const plotW = Math.max(60, w - labelW - padR);
  const maxV = Math.max(quote ?? 0, ...rows.map((r) => r.value), high ?? 0);
  const stepV = maxV > 400 ? 100 : maxV > 200 ? 50 : 25;
  const axisMax = Math.ceil((maxV * 1.04) / stepV) * stepV;
  const x = (v: number) => labelW + (v / axisMax) * plotW;
  const h = top + rows.length * rowH + axisH;
  const ticks: number[] = [];
  for (let t = 0; t <= axisMax; t += stepV) ticks.push(t);
  const hv = hover != null ? rows[hover] : null;
  return (
    <div>
      <p className="small text-[var(--paper-soft)] min-h-[1.45em]" aria-live="polite">
        {hv ? <><span className="text-[var(--paper)]">{hv.label}</span>: <span className="mono">{usd(hv.value)}</span>{quote ? <> · <span className="mono">{signedPct(hv.value / quote - 1)}</span> vs quote</> : null}</> : "Hover a point for its value."}
      </p>
      <div ref={ref}>
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block" role="img" aria-label={`Per-share values by method on one dollar axis: ${rows.map((r) => `${r.label} ${usd(r.value)}`).join(", ")}${quote ? `; quote ${usd(quote)}` : ""}.`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={top - 4} y2={top + rows.length * rowH} stroke="var(--line-dark)" />
              <text x={x(t)} y={h - 8} fontSize={11} fill="var(--paper-soft)" textAnchor="middle" className="mono">${t}</text>
            </g>
          ))}
          {low != null && high != null && (
            <g>
              <rect x={x(low)} y={top - 4} width={Math.max(1, x(high) - x(low))} height={rows.length * rowH + 4} fill="var(--paper)" opacity={0.06} />
              <text x={x(low)} y={top - 8} fontSize={10.5} fill="var(--paper-soft)">model range {usd(low)}–{usd(high)}</text>
            </g>
          )}
          {rows.map((r, i) => {
            const y = top + i * rowH + rowH / 2;
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={0} y={y - rowH / 2} width={w} height={rowH} fill="transparent" />
                <text x={labelW - 8} y={y + 4} fontSize={11.5} textAnchor="end" fill="var(--paper-soft)">{r.label}</text>
                <line x1={labelW} x2={x(r.value)} y1={y} y2={y} stroke="var(--line-dark)" strokeWidth={2} />
                <circle cx={x(r.value)} cy={y} r={hover === i ? 7 : 5.5} fill={SERIES[r.group]} />
                <text x={x(r.value) + 10} y={y + 4} fontSize={11} fill="var(--paper)" className="mono">{usd(r.value)}</text>
                <title>{`${r.label}: ${usd(r.value)}`}</title>
              </g>
            );
          })}
          {quote != null && (
            <g>
              <line x1={x(quote)} x2={x(quote)} y1={top - 4} y2={top + rows.length * rowH} stroke="var(--paper)" strokeWidth={2} strokeDasharray="4 3" />
              <text x={x(quote) - 4} y={top + rows.length * rowH - 4} fontSize={11} fill="var(--paper)" textAnchor="end" className="mono">quote {usd(quote)}</text>
            </g>
          )}
        </svg>
      </div>
      <div className="flex flex-wrap gap-4 small text-[var(--paper-soft)] mt-1">
        <span className="inline-flex items-center gap-2"><i className="inline-block w-3 h-3 rounded-full" style={{ background: SERIES[0] }} />DCF scenario</span>
        <span className="inline-flex items-center gap-2"><i className="inline-block w-3 h-3 rounded-full" style={{ background: SERIES[1] }} />Peer-median multiple</span>
        <span className="inline-flex items-center gap-2"><i className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: "var(--paper)" }} />Market quote</span>
      </div>
    </div>
  );
}

const MULT_LABEL: Record<string, string> = { ev_revenue: "Peers EV/Revenue", ev_ebitda: "Peers EV/EBITDA", pe: "Peers P/E", price_sales: "Peers P/S" };

function Valuation({ d }: { d: DemoData }) {
  const sum = obj(d.summary);
  const v = obj(sum.valuation);
  const quote = num(v.currentPrice) ?? num(obj(sum.company).current_price);
  const low = num(v.rangeLow), high = num(v.rangeHigh);
  const scen = arr(v.dcfScenarios).map(obj);
  const implied = obj(obj(v.relativeValuation).implied_values_per_share);
  const rows: { label: string; value: number; group: 0 | 1 }[] = [
    ...scen.filter((s) => num(s.implied_value_per_share) != null).map((s) => ({ label: `DCF ${str(s.name)}`, value: num(s.implied_value_per_share)!, group: 0 as const })),
    ...Object.entries(implied).filter(([, x]) => num(x) != null).map(([k, x]) => ({ label: MULT_LABEL[k] ?? k, value: num(x)!, group: 1 as const })),
  ];
  const wacc = obj(v.wacc);
  const missing = Object.entries(implied).filter(([, x]) => num(x) == null).map(([k]) => MULT_LABEL[k] ?? k);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        <Stat cls={TXT} label="Model range" value={low != null && high != null ? `${usd(low)}–${usd(high)}` : "—"} sub={str(v.methodology) || undefined} />
        <Stat label="Market quote" value={usd(quote)} sub={big(num(obj(sum.company).market_cap))} />
        <Stat cls={TXT} label="Research posture" value={str(sum.researchPosture, "—")} sub={`evidence confidence ${str(sum.evidenceConfidence, "—")}`} />
        <Stat cls={TXT} label="Report readiness" value={str(obj(sum.finalReport).readiness, "—")} sub={str(sum.underwritingStatus) || undefined} />
      </div>
      <p className="p-4 max-w-[80ch]" style={{ border: "1px solid var(--line-dark)", borderLeft: "3px solid var(--paper-soft)" }}>
        The model&apos;s DCF range and the market price disagree; the report flags it for analyst review.
        {high != null && quote != null && <span className="text-[var(--paper-soft)]"> The top of the range ({usd(high)}) is <span className="mono">{signedPct(high / quote - 1)}</span> from the quote ({usd(quote)}), while the posture reads “{str(sum.researchPosture)}”. Both are shown as the run produced them.</span>}
      </p>
      {rows.length > 0 && <ValueChart rows={rows} quote={quote} low={low} high={high} />}
      {missing.length > 0 && <p className="small text-[var(--paper-soft)]">No value for {missing.join(", ")} (the company multiple was unavailable).</p>}

      {scen.length > 0 && (
        <div className="overflow-x-auto" style={{ border: "1px solid var(--line-dark)" }}>
          <table className="w-full small min-w-[620px]">
            <caption className="text-left px-3 pt-3 pb-1 font-medium">DCF scenarios ({num(scen[0].projectionYears) ?? 10}-year FCFF)</caption>
            <thead><tr className="text-[var(--paper-soft)]">{["Scenario", "Growth start→end", "Target EBIT margin", "WACC", "Terminal growth", "Value / share", "vs quote"].map((hd, j) => <th key={hd} scope="col" className={`px-3 py-2 font-medium ${j ? "text-right" : "text-left"}`}>{hd}</th>)}</tr></thead>
            <tbody>{scen.map((s, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--line-dark)" }}>
                <th scope="row" className="px-3 py-2 text-left font-normal capitalize">{str(s.name)}</th>
                <td className="px-3 py-2 text-right mono">{pct(num(s.revenue_growth_start))} → {pct(num(s.revenue_growth_end))}</td>
                <td className="px-3 py-2 text-right mono">{pct(num(s.target_ebit_margin))}</td>
                <td className="px-3 py-2 text-right mono">{pct(num(s.wacc))}</td>
                <td className="px-3 py-2 text-right mono">{pct(num(s.terminal_growth_rate))}</td>
                <td className="px-3 py-2 text-right mono">{usd(num(s.implied_value_per_share))}</td>
                <td className="px-3 py-2 text-right mono text-[var(--neg)]">{signedPct(num(s.upside_downside))}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}

      {Object.keys(wacc).length > 0 && (
        <div>
          <h3 className="label text-[var(--paper-soft)] mb-2">WACC INPUTS</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-px" style={{ background: "var(--line-dark)" }}>
            <Stat label="Risk-free" value={pct(num(wacc.risk_free_rate), 2)} />
            <Stat label="Equity risk prem." value={pct(num(wacc.equity_risk_premium), 2)} />
            <Stat label="Beta" value={num(wacc.beta)?.toFixed(2) ?? "—"} />
            <Stat label="Cost of equity" value={pct(num(wacc.cost_of_equity), 2)} />
            <Stat label="Equity weight" value={pct(num(wacc.equity_weight), 1)} />
            <Stat label="WACC" value={pct(num(wacc.wacc), 1)} />
          </div>
        </div>
      )}
      {arr(v.assumptionsAndLimits).length > 0 && (
        <ul className="small text-[var(--paper-soft)] space-y-1 max-w-[80ch]">{arr(v.assumptionsAndLimits).map((x, i) => <li key={i} className="pl-4 relative"><span aria-hidden className="absolute left-0">–</span>{str(x)}</li>)}</ul>
      )}
    </div>
  );
}

/* ---------- report ---------- */
function Report({ d }: { d: DemoData }) {
  const sections = arr(d.reportSections).map(obj).filter((s) => str(s.markdown));
  const fr = obj(obj(d.summary).finalReport);
  return (
    <div className="space-y-4">
      {str(d.reportHeader) && <div className="p-4" style={{ background: "var(--night)" }}><Markdown source={str(d.reportHeader)} /></div>}
      <p className="small text-[var(--paper-soft)]">{sections.length} sections{fr.report_version ? <> · version <span className="mono">{str(fr.report_version)}</span></> : null}{fr.readiness ? <> · readiness {str(fr.readiness)}</> : null}. Open a section to read it as generated.</p>
      <div style={{ borderTop: "1px solid var(--line-dark)" }}>
        {sections.map((s, i) => (
          <details key={i} open={i === 0} className="group" style={{ borderBottom: "1px solid var(--line-dark)" }}>
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 py-3 px-1">
              <span><span className="mono small text-[var(--paper-soft)] mr-3">{String(i + 1).padStart(2, "0")}</span>{str(s.title, `Section ${i + 1}`)}</span>
              <span aria-hidden className="mono text-[var(--paper-soft)] group-open:rotate-45 motion-safe:transition-transform">+</span>
            </summary>
            <div className="pb-5 px-1"><Markdown source={str(s.markdown).replace(/^##\s+[^\n]*\n/, "")} /></div>
          </details>
        ))}
      </div>
      {arr(fr.warnings).length > 0 && (
        <div>
          <h3 className="label text-[var(--paper-soft)] mb-2">REPORT WARNINGS</h3>
          <ul className="small space-y-1">{arr(fr.warnings).map((x, i) => <li key={i} className="pl-4 relative"><span aria-hidden className="absolute left-0 text-[var(--paper-soft)]">–</span>{str(x)}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

/* ---------- demo ---------- */
export default function StockAgentsDemo({ data }: { data: DemoData }) {
  const d = data ?? {};
  const [view, setView] = useState<"run" | "valuation" | "report">("run");
  const sum = obj(d.summary);
  const diag = obj(sum.systemDiagnostics);
  const steps = arr(d.agentSteps);
  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="label text-[var(--paper-soft)]">TICKER</p>
          <p className="text-[22px] font-medium"><span className="mono">{str(d.ticker, "—")}</span> <span className="text-[var(--paper-soft)] text-[17px]">{str(obj(sum.company).company_name)}</span></p>
        </div>
        <Tabs label="Demo view" value={view} onChange={setView} options={[["run", "Agent run"], ["valuation", "Valuation"], ["report", "Report"]]} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        <Stat label="Timed agent calls" value={String(steps.length)} />
        <Stat label="Wall-clock run" value={num(d.runTotalSeconds) != null ? `${num(d.runTotalSeconds)} s` : "—"} />
        <Stat label="Diagnostics" value={`${num(diag.healthy_agents) ?? "—"} ok`} sub={`${num(diag.degraded_agents) ?? "—"} degraded · ${num(diag.failed_agents) ?? "—"} failed`} />
        <Stat label="Report sections" value={String(num(obj(sum.finalReport).section_count) ?? arr(d.reportSections).length)} sub={d.version ? `v${str(d.version)}` : undefined} />
      </div>
      <div role="tabpanel" aria-label={view === "run" ? "Agent run" : view === "valuation" ? "Valuation" : "Report"}>
        {view === "run" ? <AgentRun d={d} /> : view === "valuation" ? <Valuation d={d} /> : <Report d={d} />}
      </div>
    </div>
  );
}
