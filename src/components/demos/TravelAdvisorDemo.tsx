"use client";
/**
 * Multi-agent Travel Advisor: replay of a recorded free-mode run. Request → TripSpec, the agent
 * graph wave by wave (each agent's trimmed output and timing), the day-by-day plan, and the
 * verifier result. If the run data is missing, the graph still renders from the agent layout.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import type { DemoData } from "./Demo";
import { OTHER, SERIES, Stat, Tabs, usd } from "./ui";

type GraphWave = { wave: string; label?: string; agents: string[] };
type AgentRun = { agent: string; ok?: boolean; seconds?: number; error?: string | null; output?: unknown };
type RunWave = { wave: string; label?: string; agents?: AgentRun[] };
type Block = { time?: string; activity?: string; place_id?: string | null; duration_min?: number; travel_min?: number; est_cost_usd?: number };
type Day = { date?: string; title?: string; blocks?: Block[]; est_cost_usd?: number };

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const pretty = (s: string) => s.replace(/_/g, " ");
const clip = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Agent layout from the project README, used only when the run data has no agentGraph. */
const FALLBACK_GRAPH: GraphWave[] = [
  { wave: "wave 0", label: "Destination (only when none given)", agents: ["destination"] },
  { wave: "wave 1", label: "Parallel research", agents: ["flights", "stays", "places", "local_flavor", "nightlife", "conditions", "drive"] },
  { wave: "wave 2", label: "Needs wave-1 results", agents: ["transport", "hotels", "route_places", "drive_vs_fly"] },
  { wave: "wave 3", label: "Itinerary + check", agents: ["synthesizer", "verifier"] },
];

function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false),
    () => true,
  );
}

/** Collect place_id → name from every agent output, so itinerary blocks can name their venue. */
function placeNames(v: unknown, out = new Map<string, string>(), depth = 0) {
  if (depth > 6) return out;
  if (Array.isArray(v)) v.forEach((x) => placeNames(x, out, depth + 1));
  else if (isObj(v)) {
    if (typeof v.place_id === "string" && typeof v.name === "string" && !out.has(v.place_id)) out.set(v.place_id, v.name);
    Object.values(v).forEach((x) => placeNames(x, out, depth + 1));
  }
  return out;
}

export default function TravelAdvisorDemo({ data }: { data: DemoData }) {
  const graph = arr<GraphWave>(data.agentGraph).filter((w) => w && Array.isArray(w.agents));
  const waves = graph.length ? graph : FALLBACK_GRAPH;
  const runs = new Map<string, AgentRun & { wave: string }>();
  arr<RunWave>(data.waves).forEach((w) => arr<AgentRun>(w.agents).forEach((a) => a?.agent && runs.set(a.agent, { ...a, wave: w.wave })));
  const hasRun = runs.size > 0;
  const [view, setView] = useState<"agents" | "plan">("agents");

  return (
    <div className="space-y-6">
      <p className="small px-3 py-2 text-[var(--paper-soft)]" style={{ border: "1px solid var(--line-dark)" }}>
        {hasRun ? (
          <>
            <span className="text-[var(--paper)] font-medium">Replay · free mode, local 7B model. </span>
            Flights and hotels come from a cache recorded {data.source && /recorded (\d{4}-\d{2}-\d{2})/.exec(String(data.source))?.[1] ? <span className="mono">{/recorded (\d{4}-\d{2}-\d{2})/.exec(String(data.source))?.[1]}</span> : "earlier"}, with no paid API call; the trip request was rebuilt from those cached searches and the interests were chosen for the replay. The itinerary was written by a small local model, so some blocks are weak; venues come from OpenStreetMap (no ratings).
          </>
        ) : (
          <><span className="text-[var(--paper)] font-medium">Agent layout only. </span>No recorded run is attached yet, so this shows how the agents are wired, without trip data.</>
        )}
      </p>

      {hasRun && <Tabs label="Travel advisor view" value={view} onChange={setView} options={[["agents", "Agents, wave by wave"], ["plan", "The plan"]]} />}
      {(view === "agents" || !hasRun) && (
        <>
          {hasRun && <Request data={data} />}
          <Graph waves={waves} runs={runs} />
          {hasRun && <Timing waves={waves} runs={runs} />}
        </>
      )}
      {view === "plan" && hasRun && <Plan data={data} runs={runs} />}
    </div>
  );
}

function Request({ data }: { data: DemoData }) {
  const a = isObj(data.request?.answers) ? data.request.answers : {};
  const s = isObj(data.tripSpec) ? data.tripSpec : {};
  const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v == null ? "—" : String(v));
  const spec: [string, unknown][] = [
    ["origin → destination", s.origin && s.destination ? `${s.origin} → ${s.destination}` : null],
    ["window", s.window_start && s.window_end ? `${s.window_start} → ${s.window_end}` : null],
    ["trip length (days)", Array.isArray(s.trip_length_days) ? s.trip_length_days.join("–") : s.trip_length_days],
    ["travelers", s.travelers], ["budget", s.budget_total_usd == null ? "none" : usd(s.budget_total_usd as number, 0)],
    ["priority", s.priority], ["pace", s.pace], ["road trip", s.road_trip == null ? null : s.road_trip ? "yes" : "no"],
  ];
  return (
    <div className="grid md:grid-cols-2 gap-px" style={{ background: "var(--line-dark)" }}>
      <div className="p-4" style={{ background: "var(--night)" }}>
        <h3 className="small text-[var(--paper-soft)] mb-2">Request {data.request?.mode ? <span className="mono">· {String(data.request.mode)}</span> : null}</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 small">
          {Object.entries(a).map(([k, v]) => <div key={k} className="contents"><dt className="text-[var(--paper-soft)]">{pretty(k)}</dt><dd className="mono">{show(v)}</dd></div>)}
        </dl>
      </div>
      <div className="p-4" style={{ background: "var(--night)" }}>
        <h3 className="small text-[var(--paper-soft)] mb-2">Orchestrator → TripSpec</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 small">
          {spec.filter(([, v]) => v != null).map(([k, v]) => <div key={k} className="contents"><dt className="text-[var(--paper-soft)]">{k}</dt><dd className="mono">{show(v)}</dd></div>)}
        </dl>
      </div>
    </div>
  );
}

function status(r: AgentRun | undefined) {
  if (!r) return { label: "not run", cls: "text-[var(--paper-soft)]", mark: "–" };
  return r.ok === false ? { label: "failed", cls: "text-[var(--neg)]", mark: "✕" } : { label: "ok", cls: "text-[var(--pos)]", mark: "✓" };
}

function Graph({ waves, runs }: { waves: GraphWave[]; runs: Map<string, AgentRun & { wave: string }> }) {
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [agent, setAgent] = useState<string | null>(null);
  const last = waves.length - 1;
  const cur = Math.min(w, last);

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      setW((s) => {
        if (s >= last) { setPlaying(false); return s; }
        return s + 1;
      });
      setAgent(null);
    }, 2200);
    return () => window.clearInterval(t);
  }, [playing, last]);

  const go = (i: number) => { setPlaying(false); setW(i); setAgent(null); };
  const sel = agent ? runs.get(agent) : undefined;
  const btn = "h-9 px-3 small disabled:opacity-45";
  const outline = { border: "1px solid var(--line-dark)", color: "var(--paper)" } as const;

  return (
    <section aria-labelledby="ta-graph" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="ta-graph" className="h3 mr-auto">Agent graph</h3>
        <button type="button" className={btn} style={outline} onClick={() => go(Math.max(0, cur - 1))} disabled={cur === 0}>← Back</button>
        <button type="button" className={btn} style={{ background: "var(--paper)", color: "var(--night)" }} aria-pressed={playing}
          onClick={() => { if (cur >= last) { setW(0); setAgent(null); } setPlaying((p) => !p); }}>
          {playing ? "Pause" : cur >= last ? "Replay" : "Play"}
        </button>
        <button type="button" className={btn} style={outline} onClick={() => go(Math.min(last, cur + 1))} disabled={cur >= last}>Next →</button>
      </div>
      <p className="small mono text-[var(--paper-soft)]" aria-live="polite">
        request → orchestrator → {waves.map((x, i) => <span key={x.wave} className={i === cur ? "text-[var(--paper)]" : ""}>{x.wave}{i < last ? " → " : ""}</span>)} → plan
      </p>
      <ol className="grid md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        {waves.map((x, i) => {
          const done = i <= cur;
          return (
            <li key={x.wave} className={`p-3 space-y-2 ${reduced ? "" : "transition-opacity duration-300"}`}
              style={{ background: i === cur ? "var(--night)" : "var(--night-2)", opacity: done ? 1 : 0.45, boxShadow: i === cur ? "inset 0 2px 0 var(--paper)" : undefined }}>
              <div>
                <div className="label mono text-[var(--paper-soft)]">{x.wave.toUpperCase()}</div>
                <div className="small">{x.label}</div>
              </div>
              <ul className="space-y-1">
                {x.agents.map((a) => {
                  const r = runs.get(a);
                  const st = status(runs.size ? r : undefined);
                  return (
                    <li key={a}>
                      <button type="button" disabled={!done || !r} aria-pressed={agent === a} onClick={() => setAgent(agent === a ? null : a)}
                        className="w-full flex items-center justify-between gap-2 px-2 h-8 small text-left disabled:cursor-default"
                        style={agent === a ? { background: "var(--paper)", color: "var(--night)" } : { border: "1px solid var(--line-dark)" }}>
                        <span className="truncate">{pretty(a)}</span>
                        {runs.size > 0 && done && (
                          <span className={`mono shrink-0 ${agent === a ? "" : st.cls}`}>
                            <span aria-hidden>{st.mark}</span><span className="sr-only">{st.label}</span>{r && isNum(r.seconds) ? ` ${r.seconds.toFixed(1)}s` : ""}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
      {runs.size > 0 && <p className="small text-[var(--paper-soft)]">Agents marked “–” did not run on this trip (they only run when needed, e.g. no destination given or driving chosen). Pick a finished agent to see its output.</p>}
      {sel && <AgentOutput run={sel} />}
    </section>
  );
}

function summarize(v: unknown): [string, string][] {
  const nameOf = (x: unknown) => (isObj(x) ? String(x.name ?? x.airline ?? x.mode ?? x.date ?? x.title ?? "") : typeof x === "string" ? x : "");
  if (Array.isArray(v)) return [["items", `${v.length}${v.length ? `: ${clip(v.map(nameOf).filter(Boolean).join(", "), 300)}` : ""}`]];
  if (!isObj(v)) return v == null ? [] : [["output", clip(String(v), 300)]];
  return Object.entries(v).flatMap(([k, x]): [string, string][] => {
    if (x == null) return [];
    if (Array.isArray(x)) {
      const names = x.map(nameOf).filter(Boolean);
      return [[pretty(k), `${x.length} item${x.length === 1 ? "" : "s"}${names.length ? `: ${clip(names.join(", "), 220)}` : ""}`]];
    }
    if (isObj(x)) return [[pretty(k), clip(Object.entries(x).filter(([, y]) => !isObj(y) && !Array.isArray(y)).map(([a, b]) => `${pretty(a)} ${b}`).join(" · "), 220)]];
    if (typeof x === "string" && /^https?:/.test(x)) return [];
    return [[pretty(k), clip(String(x), 220)]];
  });
}

function AgentOutput({ run }: { run: AgentRun & { wave: string } }) {
  const rows = summarize(run.output);
  return (
    <div className="p-4 space-y-3" style={{ background: "var(--night)", border: "1px solid var(--line-dark)" }} aria-live="polite">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-medium">{pretty(run.agent)}</span>
        <span className={`small ${status(run).cls}`}>{status(run).label}</span>
        <span className="small mono text-[var(--paper-soft)]">{run.wave}{isNum(run.seconds) ? ` · ${run.seconds.toFixed(1)} s` : ""}</span>
      </div>
      {run.error && <p className="small mono text-[var(--neg)] break-words">{run.error}</p>}
      {run.ok === false && run.agent === "route_places" && <p className="small text-[var(--paper-soft)]">So this plan has no stops-on-the-way section; the rest of the plan shipped anyway.</p>}
      {rows.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-4 gap-y-1 small">
          {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-[var(--paper-soft)]">{k}</dt><dd className="mono break-words">{v}</dd></div>)}
        </dl>
      )}
      {run.output != null && (
        <details>
          <summary className="cursor-pointer small text-[var(--paper-soft)]">Raw output (trimmed in the export)</summary>
          <pre className="mt-2 p-3 small mono overflow-auto max-h-[320px]" style={{ background: "var(--night-2)" }}>{JSON.stringify(run.output, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

function Timing({ waves, runs }: { waves: GraphWave[]; runs: Map<string, AgentRun & { wave: string }> }) {
  const [hover, setHover] = useState<string | null>(null);
  const rows = waves.flatMap((w, wi) => w.agents.filter((a) => runs.has(a) && isNum(runs.get(a)?.seconds)).map((a) => ({ a, wi, r: runs.get(a)! })));
  if (!rows.length) return null;
  const W = 640, rowH = 24, L = 112, R = 70, H = rows.length * rowH + 8;
  const m = Math.max(...rows.map((x) => x.r.seconds as number)) || 1;
  const used = Array.from(new Set(rows.map((x) => x.wi)));
  const h = rows.find((x) => x.a === hover);
  return (
    <section aria-labelledby="ta-time" className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="ta-time" className="small text-[var(--paper-soft)]">Wall-clock seconds per agent (waves run their agents in parallel)</h3>
        <span className="small mono" aria-live="polite">{h ? `${pretty(h.a)} · ${(h.r.seconds as number).toFixed(1)} s${h.r.ok === false ? " · failed" : ""}` : ""}</span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 small text-[var(--paper-soft)]">
        {used.map((wi) => <li key={wi} className="inline-flex items-center gap-2"><i className="inline-block w-2.5 h-2.5" style={{ background: SERIES[wi % SERIES.length] }} />{waves[wi].wave}</li>)}
        <li className="inline-flex items-center gap-2"><i className="inline-block w-2.5 h-2.5" style={{ background: OTHER }} />failed</li>
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" className="block max-w-[640px]"
        aria-label={`Bar chart of seconds per agent: ${rows.map((x) => `${pretty(x.a)} ${(x.r.seconds as number).toFixed(1)} s${x.r.ok === false ? " (failed)" : ""}`).join(", ")}.`}>
        {rows.map((x, i) => {
          const y = i * rowH + 4;
          const len = ((x.r.seconds as number) / m) * (W - L - R);
          return (
            <g key={x.a} onMouseEnter={() => setHover(x.a)} onMouseLeave={() => setHover(null)}>
              <rect x={0} y={y} width={W} height={rowH} fill="transparent" />
              <text x={L - 8} y={y + 15} textAnchor="end" fontSize={12} fill="var(--paper)">{pretty(x.a)}</text>
              <rect x={L} y={y + 4} width={Math.max(1.5, len)} height={rowH - 8} fill={x.r.ok === false ? OTHER : SERIES[x.wi % SERIES.length]} opacity={hover && hover !== x.a ? 0.55 : 1} />
              <text x={L + Math.max(1.5, len) + 6} y={y + 15} fontSize={12} fill="var(--paper)" className="mono">{(x.r.seconds as number).toFixed(1)}s</text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function Plan({ data, runs }: { data: DemoData; runs: Map<string, AgentRun & { wave: string }> }) {
  const plan = isObj(data.tripPlan) ? data.tripPlan : {};
  const days = arr<Day>(plan.days);
  const [d, setD] = useState(0);
  const names = new Map<string, string>();
  runs.forEach((r) => placeNames(r.output, names));
  const f = isObj(plan.chosen_flight) ? plan.chosen_flight : {};
  const h = isObj(plan.chosen_hotel) ? plan.chosen_hotel : {};
  const v = isObj(data.verifier) ? data.verifier : {};
  const u = isObj(data.usage) ? data.usage : {};
  const repairs = arr<string>(plan.repair_adjustments);
  const issues = arr<unknown>(v.issues);
  const day = days[Math.min(d, days.length - 1)];
  const time = (s: unknown) => (typeof s === "string" ? s.slice(11, 16) : "—");

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-px" style={{ background: "var(--line-dark)" }}>
        <div className="p-4 space-y-1" style={{ background: "var(--night)" }}>
          <div className="small text-[var(--paper-soft)]">Chosen flight (scored in Python)</div>
          <div className="font-medium">{String(f.airline ?? "—")} · {f.stops === 0 ? "nonstop" : isNum(f.stops) ? `${f.stops} stop${f.stops === 1 ? "" : "s"}` : ""}</div>
          <div className="mono small">{String(f.depart_date ?? "—")} → {String(f.return_date ?? "—")} · out {time(f.outbound_departure_local)}–{time(f.outbound_arrival_local)} · {isNum(f.total_duration_min) ? `${f.total_duration_min} min` : "—"}</div>
          <div className="mono text-[22px]">{isNum(f.price_usd) ? usd(f.price_usd, 0) : "—"}</div>
        </div>
        <div className="p-4 space-y-1" style={{ background: "var(--night)" }}>
          <div className="small text-[var(--paper-soft)]">Chosen stay</div>
          <div className="font-medium">{String(h.name ?? "—")}</div>
          <div className="mono small">
            {String(plan.stay_check_in ?? "—")} → {String(plan.stay_check_out ?? "—")}
            {isNum(h.rating) ? ` · ${h.rating}★` : ""}{isNum(h.reviews) ? ` (${h.reviews} reviews)` : ""}
            {plan.dates_match === true ? " · dates match the flight" : plan.dates_match === false ? " · dates do not match" : ""}
          </div>
          <div className="mono text-[22px]">{isNum(h.total_usd) ? usd(h.total_usd, 0) : "—"}{isNum(h.price_per_night_usd) && <span className="small text-[var(--paper-soft)]"> · {usd(h.price_per_night_usd, 0)}/night</span>}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        <Stat label="Verifier" value={v.ok === true ? "passed" : v.ok === false ? "errors" : "—"} cls={v.ok === true ? "text-[var(--pos)]" : v.ok === false ? "text-[var(--neg)]" : ""}
          sub={`${issues.length} issue${issues.length === 1 ? "" : "s"}${isNum(v.synth_attempts) ? ` · attempt ${v.synth_attempts}` : ""}`} />
        <Stat label="Food & activities (est.)" value={isNum(plan.activities_food_est_usd) ? usd(plan.activities_food_est_usd, 0) : "—"} />
        <Stat label="Local-model calls" value={isNum(u.llm_calls) ? String(u.llm_calls) : "—"} sub={isNum(u.total_tokens) ? `${u.total_tokens.toLocaleString("en-US")} tokens` : undefined} />
        <Stat label="Run time" value={isNum(data.seconds) ? `${Math.round(data.seconds).toLocaleString("en-US")} s` : "—"} sub={isNum(u.cache_hits) ? `${u.cache_hits} cache hits` : undefined} />
      </div>

      {days.length > 0 && day && (
        <section aria-labelledby="ta-days" className="space-y-3">
          <h3 id="ta-days" className="h3">Day by day</h3>
          <Tabs label="Day" value={String(Math.min(d, days.length - 1))} onChange={(x) => setD(Number(x))} options={days.map((x, i) => [String(i), x.date ? x.date.slice(5) : `Day ${i + 1}`] as [string, string])} />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium">{day.title}</span>
            {isNum(day.est_cost_usd) && <span className="small text-[var(--paper-soft)]">est. spend <span className="mono text-[var(--paper)]">{usd(day.est_cost_usd, 0)}</span></span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full small min-w-[560px]">
              <thead className="text-[var(--paper-soft)]"><tr><th scope="col" className="text-left font-normal py-1">Time</th><th scope="col" className="text-left font-normal px-2">Activity</th><th scope="col" className="text-left font-normal px-2">Venue (OpenStreetMap)</th><th scope="col" className="text-right font-normal px-2">Min</th><th scope="col" className="text-right font-normal px-2">Travel</th><th scope="col" className="text-right font-normal pl-2">Est.</th></tr></thead>
              <tbody>
                {arr<Block>(day.blocks).map((b, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--line-dark)" }}>
                    <td className="mono py-1.5">{b.time ?? "—"}</td>
                    <th scope="row" className="text-left font-normal px-2">{b.activity}</th>
                    <td className="px-2 text-[var(--paper-soft)]">{b.place_id ? names.get(b.place_id) ?? <span className="mono">{b.place_id}</span> : "—"}</td>
                    <td className="mono text-right px-2">{b.duration_min ?? "—"}</td>
                    <td className="mono text-right px-2">{isNum(b.travel_min) ? `${b.travel_min}` : "—"}</td>
                    <td className="mono text-right pl-2">{isNum(b.est_cost_usd) ? usd(b.est_cost_usd, 0) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small text-[var(--paper-soft)]">Written by a 7B local model in free mode: some blocks repeat or are vague, and that is shown as recorded.</p>
        </section>
      )}

      {repairs.length > 0 && (
        <section aria-labelledby="ta-repair">
          <h3 id="ta-repair" className="small text-[var(--paper-soft)] mb-2">Repair step, before the verifier ({repairs.length} change{repairs.length === 1 ? "" : "s"}, made in code)</h3>
          <ul className="space-y-1">{repairs.map((r, i) => <li key={i} className="small px-3 py-1.5" style={{ background: "var(--night)" }}>{r}</li>)}</ul>
        </section>
      )}
      {issues.length > 0 && (
        <ul className="space-y-1">{issues.map((x, i) => <li key={i} className="small mono text-[var(--neg)]">{typeof x === "string" ? x : JSON.stringify(x)}</li>)}</ul>
      )}
    </div>
  );
}
