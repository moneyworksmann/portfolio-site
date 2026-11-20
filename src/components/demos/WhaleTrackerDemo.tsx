"use client";
/**
 * Whale Tracker demo: pick up to three 13F filers, then compare their latest top holdings,
 * quarter-over-quarter moves, sector mix and what they hold in common. Every figure is read
 * from demo-data/whale-tracker/data.json; nothing here is computed beyond sums and sorts.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { DemoData } from "./Demo";
import { Tabs, Stat, pct, big, signedPct, SERIES, OTHER } from "./ui";

/* ---------- defensive readers ---------- */
type Row = Record<string, unknown>;
const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Row[]) : []);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, f = ""): string => (typeof v === "string" ? v : f);

type Holding = { ticker: string; name: string; putCall: string; value: number | null; weight: number | null; shares: number | null; prevShares: number | null; prevWeight: number | null; change: string; sharesChangePct: number | null; sector: string };
type Quarter = { reportDate: string; filingDate: string; positions: number | null; totalValue: number | null; top10Weight: number | null; effectiveN: number | null; turnover: number | null; changeCounts: Record<string, number | null>; sectorMix: { sector: string; weight: number }[]; holdings: Holding[]; exited: Holding[] };
type Fund = { cik: string; name: string; manager: string; quarters: Quarter[] };

const readHolding = (h: Row): Holding => ({
  ticker: str(h.ticker, "?"), name: str(h.name), putCall: str(h.putCall), value: num(h.value ?? h.prevValue), weight: num(h.weight),
  shares: num(h.shares), prevShares: num(h.prevShares), prevWeight: num(h.prevWeight), change: str(h.change, "—"),
  sharesChangePct: num(h.sharesChangePct), sector: str(h.sector, "Unknown"),
});
const readQuarter = (q: Row): Quarter => {
  const cc = (q.changeCounts && typeof q.changeCounts === "object" ? q.changeCounts : {}) as Row;
  return {
    reportDate: str(q.reportDate, "—"), filingDate: str(q.filingDate), positions: num(q.positions), totalValue: num(q.totalValue),
    top10Weight: num(q.top10Weight), effectiveN: num(q.effectiveN), turnover: num(q.turnover),
    changeCounts: Object.fromEntries(CHANGE_TYPES.map((k) => [k, num(cc[k])])),
    sectorMix: arr(q.sectorMix).map((s) => ({ sector: str(s.sector, "Unknown"), weight: num(s.weight) ?? 0 })),
    holdings: arr(q.holdings).map(readHolding), exited: arr(q.exited).map(readHolding),
  };
};
const readFund = (f: Row): Fund => ({ cik: str(f.cik), name: str(f.name, "Unnamed fund"), manager: str(f.manager), quarters: arr(f.quarters).map(readQuarter) });

const CHANGE_TYPES = ["NEW", "ADDED", "REDUCED", "HELD", "EXITED"] as const;
const BADGE: Record<string, { color: string; border: string }> = {
  NEW: { color: "var(--pos)", border: "var(--pos)" },
  ADDED: { color: "var(--pos)", border: "var(--line-dark)" },
  REDUCED: { color: "var(--neg)", border: "var(--line-dark)" },
  EXITED: { color: "var(--neg)", border: "var(--neg)" },
  HELD: { color: "var(--paper-soft)", border: "var(--line-dark)" },
};
function Badge({ type }: { type: string }) {
  const s = BADGE[type] ?? BADGE.HELD;
  return <span className="inline-block mono text-[11px] leading-none px-1.5 py-1" style={{ color: s.color, border: `1px solid ${s.border}` }}>{type}</span>;
}

const shares = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: 0 }));
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

type View = "holdings" | "changes" | "sectors" | "overlap";

export default function WhaleTrackerDemo({ data }: { data: DemoData }) {
  const funds = useMemo(() => arr(data?.funds).map(readFund).filter((f) => f.quarters.length > 0), [data]);
  const notes = useMemo(() => (Array.isArray(data?.notes) ? (data.notes as unknown[]).filter((n): n is string => typeof n === "string") : []), [data]);
  const [picked, setPicked] = useState<string[]>(() => {
    const prefer = ["1067983", "1656456", "1167483"].filter((c) => funds.some((f) => f.cik === c));
    return prefer.length ? prefer : funds.slice(0, 3).map((f) => f.cik);
  });
  const [view, setView] = useState<View>("holdings");

  if (!funds.length) return <p className="text-[var(--paper-soft)]">No fund data in this export, so there is nothing to show yet.</p>;

  const selected = funds.filter((f) => picked.includes(f.cik));
  const toggle = (cik: string) =>
    setPicked((p) => (p.includes(cik) ? (p.length > 1 ? p.filter((c) => c !== cik) : p) : p.length < 3 ? [...p, cik] : p));
  const dates = new Set(selected.map((f) => f.quarters[0].reportDate));

  return (
    <div className="space-y-5 min-w-0">
      <fieldset>
        <legend className="small text-[var(--paper-soft)] mb-2">Funds to compare (pick 1–3)</legend>
        <div className="flex flex-wrap gap-1.5">
          {funds.map((f) => {
            const on = picked.includes(f.cik);
            const blocked = !on && picked.length >= 3;
            return (
              <button key={f.cik} type="button" aria-pressed={on} disabled={blocked} onClick={() => toggle(f.cik)}
                title={blocked ? "Deselect a fund first (max 3)" : f.manager || undefined}
                className="h-9 px-3 small transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
                style={on ? { background: "var(--paper)", color: "var(--night)" } : { border: "1px solid var(--line-dark)", color: "var(--paper-soft)" }}>
                {f.name}
              </button>
            );
          })}
        </div>
        {dates.size > 1 && (
          <p className="small text-[var(--paper-soft)] mt-2">
            Latest quarters differ: {selected.map((f) => `${f.name} ${f.quarters[0].reportDate}`).join(" · ")}.
          </p>
        )}
      </fieldset>

      <Tabs label="Whale Tracker view" value={view} onChange={setView}
        options={[["holdings", "Top holdings"], ["changes", "Quarter changes"], ["sectors", "Sector mix"], ["overlap", "Overlap"]]} />

      {view === "holdings" && <HoldingsView funds={selected} />}
      {view === "changes" && <ChangesView funds={selected} />}
      {view === "sectors" && <SectorView funds={selected} all={funds} />}
      {view === "overlap" && <OverlapView funds={selected} data={data} />}

      {notes.length > 0 && (
        <details className="small text-[var(--paper-soft)]">
          <summary className="cursor-pointer">How these numbers are defined</summary>
          <ul className="list-disc pl-5 mt-2 space-y-1">{notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

/* ---------- Top holdings ---------- */
function HoldingsView({ funds }: { funds: Fund[] }) {
  const [cik, setCik] = useState(funds[0]?.cik ?? "");
  const fund = funds.find((f) => f.cik === cik) ?? funds[0];
  if (!fund) return null;
  const q = fund.quarters[0];
  const maxW = Math.max(0.0001, ...q.holdings.map((h) => h.weight ?? 0));
  return (
    <div className="space-y-4">
      <label className="flex flex-wrap items-center gap-2 small text-[var(--paper-soft)]">
        Fund
        <select value={fund.cik} onChange={(e) => setCik(e.target.value)} className="h-9 px-2 text-[var(--paper)]" style={{ background: "var(--night)", border: "1px solid var(--line-dark)" }}>
          {funds.map((f) => <option key={f.cik} value={f.cik}>{f.name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        <Stat label="Report date" value={q.reportDate} sub={q.filingDate ? `filed ${q.filingDate}` : undefined} />
        <Stat label="Reported value" value={big(q.totalValue)} sub={q.positions != null ? `${q.positions} positions` : undefined} />
        <Stat label="Top 10 weight" value={pct(q.top10Weight)} />
        <Stat label="Effective N" value={q.effectiveN != null ? q.effectiveN.toFixed(1) : "—"} sub={q.turnover != null ? `turnover ${pct(q.turnover)}` : undefined} />
      </div>
      {q.holdings.length ? (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${fund.name} top holdings table`}>
          <table className="w-full small">
            <caption className="sr-only">{fund.name} top holdings, {q.reportDate}</caption>
            <thead><tr>
              <th scope="col" className={thCls}>#</th><th scope="col" className={thCls}>Ticker</th><th scope="col" className={thCls}>Name</th>
              <th scope="col" className={thCls}>Weight</th><th scope="col" className={`${thCls} text-right`}>Value</th>
              <th scope="col" className={thCls}>vs prior qtr</th><th scope="col" className={`${thCls} text-right`}>Shares Δ</th>
            </tr></thead>
            <tbody>
              {q.holdings.map((h, i) => (
                <tr key={`${h.ticker}-${h.putCall}-${i}`} style={rowStyle} className="hover:bg-[var(--night)]">
                  <td className={`${tdCls} mono text-[var(--paper-soft)]`}>{i + 1}</td>
                  <td className={`${tdCls} mono`}>{h.ticker}{h.putCall ? <span className="text-[var(--paper-soft)]"> {h.putCall}</span> : null}</td>
                  <td className={`${tdCls} max-w-[220px] truncate`} title={h.name}>{h.name}</td>
                  <td className={tdCls}>
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2" style={{ width: `${Math.max(2, ((h.weight ?? 0) / maxW) * 80)}px`, background: SERIES[0] }} aria-hidden />
                      <span className="mono">{pct(h.weight)}</span>
                    </span>
                  </td>
                  <td className={`${tdCls} mono text-right`}>{big(h.value)}</td>
                  <td className={tdCls}><Badge type={h.change} /></td>
                  <td className={`${tdCls} mono text-right ${h.sharesChangePct == null ? "text-[var(--paper-soft)]" : h.sharesChangePct > 0.001 ? "text-[var(--pos)]" : h.sharesChangePct < -0.001 ? "text-[var(--neg)]" : ""}`}>
                    {h.change === "NEW" ? "new" : signedPct(h.sharesChangePct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Note>No holdings rows were exported for this quarter.</Note>}
      <Note>Top {q.holdings.length} lines by value{q.positions != null && q.positions > q.holdings.length ? ` of ${q.positions}` : ""}. Weight is the share of the fund&apos;s total reported 13F value.</Note>
    </div>
  );
}

/* ---------- Quarter changes ---------- */
function ChangesView({ funds }: { funds: Fund[] }) {
  const [filter, setFilter] = useState<string>("ALL");
  const rows = funds.flatMap((f) => {
    const q = f.quarters[0];
    return [...q.holdings, ...q.exited].map((h) => ({ fund: f, h }));
  }).filter(({ h }) => (filter === "ALL" ? h.change !== "HELD" : h.change === filter));
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Change counts by fund">
        <table className="w-full small">
          <caption className="sr-only">Count of positions by change type in each fund&apos;s latest quarter</caption>
          <thead><tr>
            <th scope="col" className={thCls}>Fund · quarter</th>
            {CHANGE_TYPES.map((t) => <th key={t} scope="col" className={`${thCls} text-right`}><Badge type={t} /></th>)}
          </tr></thead>
          <tbody>
            {funds.map((f) => (
              <tr key={f.cik} style={rowStyle}>
                <th scope="row" className={`${tdCls} text-left font-normal`}>{f.name} <span className="mono text-[var(--paper-soft)]">{f.quarters[0].reportDate}</span></th>
                {CHANGE_TYPES.map((t) => <td key={t} className={`${tdCls} mono text-right`}>{f.quarters[0].changeCounts[t] ?? "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div role="group" aria-label="Filter moves by type" className="flex flex-wrap gap-1">
        {["ALL", "NEW", "ADDED", "REDUCED", "EXITED"].map((t) => (
          <button key={t} type="button" aria-pressed={filter === t} onClick={() => setFilter(t)} className="h-8 px-2.5 small"
            style={filter === t ? { background: "var(--paper)", color: "var(--night)" } : { border: "1px solid var(--line-dark)", color: "var(--paper-soft)" }}>
            {t === "ALL" ? "All moves" : t}
          </button>
        ))}
      </div>
      {rows.length ? (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Position changes table">
          <table className="w-full small">
            <caption className="sr-only">Position changes versus the prior quarter</caption>
            <thead><tr>
              <th scope="col" className={thCls}>Fund</th><th scope="col" className={thCls}>Ticker</th><th scope="col" className={thCls}>Move</th>
              <th scope="col" className={`${thCls} text-right`}>Shares before → now</th><th scope="col" className={`${thCls} text-right`}>Weight before → now</th>
            </tr></thead>
            <tbody>
              {rows.map(({ fund, h }, i) => (
                <tr key={`${fund.cik}-${h.ticker}-${h.putCall}-${i}`} style={rowStyle} className="hover:bg-[var(--night)]">
                  <td className={tdCls}>{fund.name}</td>
                  <td className={`${tdCls} mono`} title={h.name}>{h.ticker}{h.putCall ? ` ${h.putCall}` : ""}</td>
                  <td className={tdCls}><Badge type={h.change} /></td>
                  <td className={`${tdCls} mono text-right`}>{shares(h.prevShares)} → {h.change === "EXITED" ? "0" : shares(h.shares)}</td>
                  <td className={`${tdCls} mono text-right`}>{pct(h.prevWeight, 2)} → {h.change === "EXITED" ? "0.00%" : pct(h.weight, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Note>No moves of this type among the exported rows.</Note>}
      <Note>Counts cover each full filing. The list only covers the exported rows: the top 25 holdings and the 15 largest exits per fund.</Note>
    </div>
  );
}

/* ---------- Sector mix (stacked bars) ---------- */
const NON_SECTORS = new Set(["Unknown", "Other"]);
function SectorView({ funds, all }: { funds: Fund[]; all: Fund[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ fund: string; key: string } | null>(null);
  // Fixed colour order: the six largest named sectors across all five funds, so colours never move with selection.
  const keys = useMemo(() => {
    const tot = new Map<string, number>();
    all.forEach((f) => f.quarters[0].sectorMix.forEach((s) => { if (!NON_SECTORS.has(s.sector)) tot.set(s.sector, (tot.get(s.sector) ?? 0) + s.weight); }));
    return [...tot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
  }, [all]);
  const OTHER_KEY = "All other & unclassified";
  const bucket = (f: Fund) => {
    const m = new Map<string, number>(keys.map((k) => [k, 0]));
    let other = 0;
    f.quarters[0].sectorMix.forEach((s) => (keys.includes(s.sector) ? m.set(s.sector, (m.get(s.sector) ?? 0) + s.weight) : (other += s.weight)));
    m.set(OTHER_KEY, other);
    return m;
  };
  const allKeys = [...keys, OTHER_KEY];
  const color = (k: string) => (k === OTHER_KEY ? OTHER : SERIES[keys.indexOf(k)]);
  if (!funds.some((f) => f.quarters[0].sectorMix.length)) return <Note>No sector mix was exported for these funds.</Note>;

  const labelW = Math.min(150, width * 0.34), barH = 26, gap = 18, padR = 8;
  const plotW = Math.max(60, width - labelW - padR);
  const h = funds.length * (barH + gap);
  const buckets = funds.map((f) => ({ f, m: bucket(f) }));
  const hv = hover ? buckets.find((b) => b.f.cik === hover.fund) : null;

  return (
    <div className="space-y-3">
      <div className="small min-h-[1.5em]" aria-live="polite">
        {hv && hover ? <span><span className="text-[var(--paper-soft)]">{hv.f.name} ·</span> {hover.key} <span className="mono">{pct(hv.m.get(hover.key))}</span></span>
          : <span className="text-[var(--paper-soft)]">Hover a segment or a table row for its weight.</span>}
      </div>
      <div ref={ref} className="w-full">
        <svg width={width} height={h} role="img" aria-label={`Sector mix by weight for ${funds.map((f) => f.name).join(", ")}; values in the table below`}>
          {buckets.map(({ f, m }, i) => {
            let x = labelW;
            const y = i * (barH + gap);
            return (
              <g key={f.cik}>
                <text x={0} y={y + barH / 2 + 4} fill="var(--paper)" fontSize={13}>{f.name.length > 22 ? `${f.name.slice(0, 21)}…` : f.name}</text>
                {allKeys.map((k) => {
                  const w = (m.get(k) ?? 0) * plotW;
                  const r = <rect key={k} x={x} y={y} width={Math.max(0, w - 1)} height={barH} fill={color(k)}
                    opacity={hover && !(hover.fund === f.cik && hover.key === k) ? 0.45 : 1}
                    onMouseEnter={() => setHover({ fund: f.cik, key: k })} onMouseLeave={() => setHover(null)}>
                    <title>{`${f.name} · ${k}: ${pct(m.get(k))}`}</title></rect>;
                  x += w;
                  return r;
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Sector mix legend and values">
        <table className="w-full small">
          <caption className="sr-only">Sector weights per fund, latest quarter</caption>
          <thead><tr><th scope="col" className={thCls}>Sector</th>{funds.map((f) => <th key={f.cik} scope="col" className={`${thCls} text-right`}>{f.name}</th>)}</tr></thead>
          <tbody>
            {allKeys.map((k) => (
              <tr key={k} style={rowStyle} className={hover?.key === k ? "bg-[var(--night)]" : ""} tabIndex={0}
                onMouseEnter={() => setHover({ fund: funds[0].cik, key: k })} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ fund: funds[0].cik, key: k })} onBlur={() => setHover(null)}>
                <th scope="row" className={`${tdCls} text-left font-normal`}>
                  <span className="inline-block w-2.5 h-2.5 mr-2 align-middle" style={{ background: color(k) }} aria-hidden />{k}
                </th>
                {buckets.map(({ f, m }) => <td key={f.cik} className={`${tdCls} mono text-right ${hover?.key === k && hover.fund === f.cik ? "underline" : ""}`}>{pct(m.get(k))}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>Sectors come from SEC SIC codes, so ETFs and some foreign issuers are &quot;Unknown&quot; and sit in the grey bucket.</Note>
    </div>
  );
}

/* ---------- Overlap ---------- */
function OverlapView({ funds, data }: { funds: Fund[]; data: DemoData }) {
  if (funds.length < 2) return <Note>Pick at least two funds above to see what they hold in common.</Note>;
  const ciks = funds.map((f) => f.cik);
  const name = (c: string) => funds.find((f) => f.cik === c)?.name ?? c;
  const pairs = arr(data?.overlap).filter((o) => ciks.includes(str(o.a)) && ciks.includes(str(o.b)));
  const common = arr(data?.commonHoldings)
    .map((c) => ({ ticker: str(c.ticker, "?"), name: str(c.name), holders: arr(c.holders).filter((h) => ciks.includes(str(h.cik))) }))
    .filter((c) => c.holders.length >= 2)
    .sort((a, b) => b.holders.length - a.holders.length || b.holders.reduce((s, h) => s + (num(h.weight) ?? 0), 0) - a.holders.reduce((s, h) => s + (num(h.weight) ?? 0), 0));
  const inAll = common.filter((c) => c.holders.length === funds.length).length;

  return (
    <div className="space-y-4">
      {pairs.length ? (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Pairwise overlap table">
          <table className="w-full small">
            <caption className="sr-only">Pairwise overlap between the selected funds&apos; latest long positions</caption>
            <thead><tr>
              <th scope="col" className={thCls}>Pair</th><th scope="col" className={`${thCls} text-right`}>Shared names</th>
              <th scope="col" className={`${thCls} text-right`} title="Shared names ÷ all names held by either">Jaccard</th>
              <th scope="col" className={`${thCls} text-right`} title="Cosine similarity of the two weight vectors">Cosine (by weight)</th>
              <th scope="col" className={`${thCls} text-right`} title="Sum of the smaller weight across shared names">Overlap weight</th>
            </tr></thead>
            <tbody>
              {pairs.map((o) => (
                <tr key={`${o.a}-${o.b}`} style={rowStyle} className="hover:bg-[var(--night)]">
                  <th scope="row" className={`${tdCls} text-left font-normal`}>{name(str(o.a))} × {name(str(o.b))}</th>
                  <td className={`${tdCls} mono text-right`}>{num(o.sharedCount) ?? "—"}</td>
                  <td className={`${tdCls} mono text-right`}>{num(o.jaccard)?.toFixed(3) ?? "—"}</td>
                  <td className={`${tdCls} mono text-right`}>{num(o.cosine)?.toFixed(3) ?? "—"}</td>
                  <td className={`${tdCls} mono text-right`}>{pct(num(o.overlapWeight))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Note>No pairwise overlap figures were exported for this selection.</Note>}

      <div>
        <h3 className="small text-[var(--paper-soft)] mb-2">
          Names held by two or more of the selected funds{funds.length > 2 ? ` · ${inAll} held by all ${funds.length}` : ""}
        </h3>
        {common.length ? (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Shared holdings table">
            <table className="w-full small">
              <caption className="sr-only">Weight of each shared name in each selected fund</caption>
              <thead><tr>
                <th scope="col" className={thCls}>Ticker</th><th scope="col" className={thCls}>Name</th>
                {funds.map((f) => <th key={f.cik} scope="col" className={`${thCls} text-right`}>{f.name}</th>)}
              </tr></thead>
              <tbody>
                {common.map((c) => (
                  <tr key={`${c.ticker}-${c.name}`} style={rowStyle} className="hover:bg-[var(--night)]">
                    <td className={`${tdCls} mono`}>{c.ticker}</td>
                    <td className={`${tdCls} max-w-[200px] truncate`} title={c.name}>{c.name}</td>
                    {funds.map((f) => {
                      const hw = c.holders.find((h) => str(h.cik) === f.cik);
                      return <td key={f.cik} className={`${tdCls} mono text-right ${hw ? "" : "text-[var(--paper-soft)]"}`}>{hw ? pct(num(hw.weight), 2) : "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Note>None of the exported shared names are held by two of these funds.</Note>}
      </div>
      <Note>
        Overlap uses each fund&apos;s latest long positions, matched by CUSIP (so GOOG and GOOGL count separately). The shared-names list draws on the 30 most widely
        held names across all five funds in this export, so a pair can share more names than appear here; the pair table has the full count.
      </Note>
    </div>
  );
}
