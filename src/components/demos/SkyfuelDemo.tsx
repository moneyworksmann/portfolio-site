"use client";
/**
 * SkyFuel AI: what-if fuel lookups on the exported model grid, model metrics from the run,
 * and SHAP contributions for the six sample flights. Every number comes from data.json.
 */
import { useEffect, useRef, useState } from "react";
import type { DemoData } from "./Demo";
import { OTHER, SERIES, Stat, Tabs } from "./ui";

type Cell = { fl: number; payload_kg: number; fuel_kg: number; co2_kg: number; extrapolation?: boolean };
type Route = {
  route: string; origin?: string; dest?: string; base_flight_id?: string; base_planned_fl?: number; base_payload_kg?: number;
  trained_fl_range?: number[]; n_flights?: number; label_fuel_kg_mean?: number;
  held_constant?: { gc_distance_km?: number; forecast_headwind_kt?: number; taxi_out_est_min?: number }; grid?: Cell[];
};
type Contribution = { feature: string; value?: number; unit?: string; kg: number };
type ShapFlight = {
  flight_id: string; route?: string; dep_time_utc?: string; physics_label_fuel_kg?: number; pred_fuel_kg?: number;
  pred_co2_kg?: number; base_fuel_kg?: number; contributions?: Contribution[]; sum_check_kg?: number;
  fuel_by_phase_kg?: Record<string, number>;
};
type Metric = { mae_kg?: number; rmse_kg?: number; mape_pct?: number; r2?: number; n?: number };
type Audit = { scenario: string; n?: number; physics_mean_delta_kg?: number; model_mean_delta_kg?: number; sign_agreement?: number };
type Parity = { route: string; label: number; pred: number };

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const kg = (v: unknown, d = 0) => (isNum(v) ? v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—");
const FEATURE: Record<string, string> = {
  gc_distance_km: "Distance", planned_fl: "Flight level", forecast_headwind_kt: "Headwind",
  planned_payload_kg: "Payload", taxi_out_est_min: "Taxi-out",
};
const MODEL: Record<string, string> = {
  route_mean_baseline: "Route-mean baseline", linear: "Linear", random_forest: "Random forest",
  xgboost: "XGBoost", lightgbm: "LightGBM", trend_xgboost: "Trend + XGBoost",
};

function useWidth<T extends HTMLElement>(initial = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function ticks(min: number, max: number, n = 4) {
  const span = max - min || 1;
  const raw = span / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) out.push(+t.toFixed(6));
  return out;
}

export default function SkyfuelDemo({ data }: { data: DemoData }) {
  const [view, setView] = useState<"whatif" | "shap" | "metrics">("whatif");
  return (
    <div className="space-y-6">
      {data.dataNote && (
        <p className="small px-3 py-2 text-[var(--paper-soft)]" style={{ border: "1px solid var(--line-dark)" }}>
          <span className="text-[var(--paper)] font-medium">Synthetic data. </span>{String(data.dataNote)}
        </p>
      )}
      <Tabs label="SkyFuel view" value={view} onChange={setView}
        options={[["whatif", "What-if"], ["shap", "Why this prediction (SHAP)"], ["metrics", "Model metrics"]]} />
      {view === "whatif" && <WhatIf data={data} />}
      {view === "shap" && <Shap data={data} />}
      {view === "metrics" && <Metrics data={data} />}
    </div>
  );
}

/* ---------------- What-if ---------------- */

function WhatIf({ data }: { data: DemoData }) {
  const routes = arr<Route>(data.whatIfGrid?.routes).filter((r) => r && typeof r.route === "string");
  const axes = data.whatIfGrid?.axes ?? {};
  const fls = arr<number>(axes.fl).filter(isNum);
  const pays = arr<number>(axes.payload_kg).filter(isNum);
  const co2Factor = isNum(data.model?.co2_per_kg_fuel) ? data.model.co2_per_kg_fuel : null;

  const [ri, setRi] = useState(0);
  const route = routes[Math.min(ri, routes.length - 1)];
  const nearestIdx = (list: number[], v: unknown) => (isNum(v) && list.length ? list.reduce((b, x, i) => (Math.abs(x - v) < Math.abs(list[b] - v) ? i : b), 0) : 0);
  const [fi, setFi] = useState(() => nearestIdx(fls, routes[0]?.base_planned_fl));
  const [pi, setPi] = useState(() => nearestIdx(pays, routes[0]?.base_payload_kg));

  if (!routes.length || !fls.length || !pays.length) return <p className="text-[var(--paper-soft)]">No what-if grid in this export.</p>;

  const fl = fls[Math.min(fi, fls.length - 1)];
  const pay = pays[Math.min(pi, pays.length - 1)];
  const grid = arr<Cell>(route.grid);
  const cell = grid.find((c) => c.fl === fl && c.payload_kg === pay);
  const baseCell = grid.find((c) => c.fl === fls[nearestIdx(fls, route.base_planned_fl)] && c.payload_kg === pays[nearestIdx(pays, route.base_payload_kg)]);
  const delta = cell && baseCell ? cell.fuel_kg - baseCell.fuel_kg : null;
  const series = fls.map((f) => grid.find((c) => c.fl === f && c.payload_kg === pay)).filter((c): c is Cell => !!c && isNum(c.fuel_kg));
  const hc = route.held_constant ?? {};
  const tr = arr<number>(route.trained_fl_range);

  const pickRoute = (i: number) => {
    setRi(i);
    setFi(nearestIdx(fls, routes[i]?.base_planned_fl));
    setPi(nearestIdx(pays, routes[i]?.base_payload_kg));
  };

  return (
    <div className="grid lg:grid-cols-[minmax(0,320px)_1fr] gap-6">
      <div className="space-y-5">
        <div>
          <label htmlFor="sf-route" className="small text-[var(--paper-soft)] block mb-1">Route (A320{route.n_flights ? `, ${route.n_flights} flights in training data` : ""})</label>
          <select id="sf-route" value={ri} onChange={(e) => pickRoute(Number(e.target.value))}
            className="w-full h-11 px-3 mono" style={{ background: "var(--night)", color: "var(--paper)", border: "1px solid var(--line-dark)" }}>
            {routes.map((r, i) => <option key={r.route} value={i}>{r.origin && r.dest ? `${r.origin} → ${r.dest}` : r.route}</option>)}
          </select>
        </div>
        <Slider id="sf-fl" label="Cruise flight level" value={fi} max={fls.length - 1} onChange={setFi} display={`FL${fl}`}
          min0={`FL${fls[0]}`} max0={`FL${fls[fls.length - 1]}`} />
        <Slider id="sf-pay" label="Payload" value={pi} max={pays.length - 1} onChange={setPi} display={`${kg(pay / 1000, 0)} t`}
          min0={`${kg(pays[0] / 1000)} t`} max0={`${kg(pays[pays.length - 1] / 1000)} t`} />
        <dl className="small grid grid-cols-2 gap-x-3 gap-y-1 text-[var(--paper-soft)]">
          <dt>Held at base flight</dt><dd className="mono text-[var(--paper)] truncate" title={route.base_flight_id}>{route.base_flight_id ?? "—"}</dd>
          <dt>Distance</dt><dd className="mono text-[var(--paper)]">{kg(hc.gc_distance_km, 0)} km</dd>
          <dt>Forecast headwind</dt><dd className="mono text-[var(--paper)]">{kg(hc.forecast_headwind_kt, 1)} kt</dd>
          <dt>Taxi-out estimate</dt><dd className="mono text-[var(--paper)]">{kg(hc.taxi_out_est_min, 0)} min</dd>
          <dt>FLs seen in training</dt><dd className="mono text-[var(--paper)]">{tr.length === 2 ? `FL${tr[0]}–${tr[1]}` : "—"}</dd>
        </dl>
      </div>

      <div className="space-y-4 min-w-0">
        <div className="grid grid-cols-2 gap-px" style={{ background: "var(--line-dark)" }} aria-live="polite">
          <Stat label="Predicted block fuel" value={cell ? `${kg(cell.fuel_kg)} kg` : "—"}
            sub={delta != null ? `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${kg(Math.abs(delta))} kg vs base flight's FL/payload` : undefined} />
          <Stat label="CO₂" value={cell ? `${kg(cell.co2_kg)} kg` : "—"} sub={co2Factor ? `fuel × ${co2Factor}` : undefined} />
        </div>
        {cell?.extrapolation && (
          <p className="small px-3 py-2" style={{ border: "1px solid var(--neg)" }}>
            <span className="text-[var(--neg)] font-medium">Extrapolating. </span>
            FL{fl} is more than 20 levels outside what this route saw in training, so treat this number with care (same rule the dashboard uses).
          </p>
        )}
        <FuelByFl series={series} fl={fl} payload={pay} trained={tr} onPick={(f) => setFi(fls.indexOf(f))} />
        {data.whatIfGrid?.note && <p className="small text-[var(--paper-soft)]">{String(data.whatIfGrid.note)}</p>}
      </div>
    </div>
  );
}

function Slider({ id, label, value, max, onChange, display, min0, max0 }: { id: string; label: string; value: number; max: number; onChange: (v: number) => void; display: string; min0: string; max0: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="small text-[var(--paper-soft)]">{label}</label>
        <output htmlFor={id} className="mono">{display}</output>
      </div>
      <input id={id} type="range" min={0} max={max} step={1} value={value} aria-valuetext={display}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full mt-2 accent-[var(--paper)]" />
      <div className="flex justify-between small mono text-[var(--paper-soft)]"><span>{min0}</span><span>{max0}</span></div>
    </div>
  );
}

function FuelByFl({ series, fl, payload, trained, onPick }: { series: Cell[]; fl: number; payload: number; trained: number[]; onPick: (fl: number) => void }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<Cell | null>(null);
  if (series.length < 2) return null;
  const H = 230, L = 56, R = 14, T = 16, B = 34;
  const ys = series.map((c) => c.fuel_kg);
  const yt = ticks(Math.min(...ys), Math.max(...ys));
  const y0 = Math.min(yt[0], ...ys), y1 = Math.max(yt[yt.length - 1], ...ys);
  const f0 = series[0].fl, f1 = series[series.length - 1].fl;
  const x = (f: number) => L + ((f - f0) / (f1 - f0 || 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const path = series.map((c, i) => `${i ? "L" : "M"}${x(c.fl).toFixed(1)},${y(c.fuel_kg).toFixed(1)}`).join("");
  const sel = series.find((c) => c.fl === fl);
  const shown = hover ?? sel;
  const xt = series.filter((_, i) => i % 3 === 0).map((c) => c.fl);
  return (
    <div ref={ref}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 small">
        <span className="text-[var(--paper-soft)]">Predicted fuel by flight level at {kg(payload / 1000)} t payload</span>
        <span className="mono" aria-live="polite">{shown ? `FL${shown.fl} · ${kg(shown.fuel_kg)} kg${shown.extrapolation ? " · extrapolated" : ""}` : ""}</span>
      </div>
      <svg width={W} height={H} role="img" className="block mt-2"
        aria-label={`Line chart of predicted fuel against flight level, FL${f0} to FL${f1}, at ${payload} kg payload. Ranges from ${kg(Math.min(...ys))} to ${kg(Math.max(...ys))} kg.`}>
        {trained.length === 2 && (
          <g>
            <rect x={x(Math.max(f0, trained[0] - 20))} y={T} width={Math.max(0, x(Math.min(f1, trained[1] + 20)) - x(Math.max(f0, trained[0] - 20)))} height={H - T - B} fill={OTHER} opacity={0.18} />
            <text x={x(Math.max(f0, trained[0] - 20)) + 4} y={T + 12} fontSize={11} fill="var(--paper-soft)">within 20 FL of training range</text>
          </g>
        )}
        {yt.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line-dark)" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--paper-soft)" className="mono">{kg(t)}</text>
          </g>
        ))}
        {xt.map((f) => <text key={f} x={x(f)} y={H - 12} textAnchor="middle" fontSize={11} fill="var(--paper-soft)" className="mono">FL{f}</text>)}
        <text x={4} y={T - 4} fontSize={11} fill="var(--paper-soft)">kg</text>
        <path d={path} fill="none" stroke={SERIES[0]} strokeWidth={2} />
        {series.map((c) => (
          <g key={c.fl} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)} onClick={() => onPick(c.fl)} style={{ cursor: "pointer" }}>
            <circle cx={x(c.fl)} cy={y(c.fuel_kg)} r={12} fill="transparent" />
            <circle cx={x(c.fl)} cy={y(c.fuel_kg)} r={c.fl === fl ? 6 : 3} fill={c.extrapolation ? "var(--night-2)" : SERIES[0]} stroke={SERIES[0]} strokeWidth={2} />
          </g>
        ))}
        {sel && <text x={Math.min(W - R - 4, Math.max(L + 4, x(sel.fl)))} y={y(sel.fuel_kg) - 12} textAnchor={x(sel.fl) > W - 80 ? "end" : "middle"} fontSize={12} fill="var(--paper)" className="mono">{kg(sel.fuel_kg)}</text>}
      </svg>
      <p className="small text-[var(--paper-soft)] mt-1">Filled dots are inside the trusted range; hollow dots are extrapolated.</p>
    </div>
  );
}

/* ---------------- SHAP ---------------- */

function Shap({ data }: { data: DemoData }) {
  const flights = arr<ShapFlight>(data.shapFlights).filter((f) => f && f.flight_id);
  const [i, setI] = useState(0);
  if (!flights.length) return <p className="text-[var(--paper-soft)]">No SHAP sample in this export.</p>;
  const f = flights[Math.min(i, flights.length - 1)];
  const contrib = arr<Contribution>(f.contributions).filter((c) => isNum(c.kg)).sort((a, b) => Math.abs(b.kg) - Math.abs(a.kg));
  const phases = Object.entries(f.fuel_by_phase_kg ?? {}).filter(([, v]) => isNum(v));
  const err = isNum(f.pred_fuel_kg) && isNum(f.physics_label_fuel_kg) ? f.pred_fuel_kg - f.physics_label_fuel_kg : null;
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="sf-flight" className="small text-[var(--paper-soft)] block mb-1">Sample flight (median-fuel held-out flight per route)</label>
        <select id="sf-flight" value={i} onChange={(e) => setI(Number(e.target.value))}
          className="w-full sm:w-auto h-11 px-3 mono" style={{ background: "var(--night)", color: "var(--paper)", border: "1px solid var(--line-dark)" }}>
          {flights.map((x, k) => <option key={x.flight_id} value={k}>{x.route ?? x.flight_id} · {x.flight_id}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        <Stat label="Model baseline" value={`${kg(f.base_fuel_kg)} kg`} sub="average prediction" />
        <Stat label="Prediction" value={`${kg(f.pred_fuel_kg)} kg`} sub={isNum(f.pred_co2_kg) ? `${kg(f.pred_co2_kg)} kg CO₂` : undefined} />
        <Stat label="Physics label (OpenAP)" value={`${kg(f.physics_label_fuel_kg)} kg`} />
        <Stat label="Error" value={err == null ? "—" : `${err > 0 ? "+" : err < 0 ? "−" : ""}${kg(Math.abs(err), 1)} kg`} />
      </div>
      <ShapBars contrib={contrib} base={f.base_fuel_kg} pred={f.pred_fuel_kg} />
      {isNum(f.sum_check_kg) && (
        <p className="small text-[var(--paper-soft)]">
          Baseline + contributions = <span className="mono text-[var(--paper)]">{kg(f.sum_check_kg, 1)} kg</span>, matching the prediction exactly.
        </p>
      )}
      {phases.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full small min-w-[420px]">
            <caption className="text-left text-[var(--paper-soft)] pb-2">Physics fuel by phase for this flight (kg, OpenAP)</caption>
            <thead><tr className="text-[var(--paper-soft)]">{phases.map(([p]) => <th key={p} scope="col" className="text-right font-normal px-2 py-1">{p.replace("_", "-")}</th>)}</tr></thead>
            <tbody><tr>{phases.map(([p, v]) => <td key={p} className="mono text-right px-2 py-1" style={{ borderTop: "1px solid var(--line-dark)" }}>{kg(v, 1)}</td>)}</tr></tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ShapBars({ contrib, base, pred }: { contrib: Contribution[]; base?: number; pred?: number }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<Contribution | null>(null);
  if (!contrib.length) return null;
  const rowH = 34, T = 8, H = T + contrib.length * rowH + 24;
  const labelW = W < 460 ? 108 : 170;
  const pad = 62;
  const zero = labelW + (W - labelW) / 2;
  const half = (W - labelW) / 2 - pad;
  const m = Math.max(...contrib.map((c) => Math.abs(c.kg))) || 1;
  const len = (v: number) => (Math.abs(v) / m) * half;
  const fmt = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${kg(Math.abs(v), 1)}`;
  const shown = hover;
  return (
    <div ref={ref}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 small text-[var(--paper-soft)]">
        <span className="inline-flex items-center gap-2"><i className="inline-block w-3 h-3" style={{ background: SERIES[1] }} />adds fuel</span>
        <span className="inline-flex items-center gap-2"><i className="inline-block w-3 h-3" style={{ background: SERIES[0] }} />saves fuel</span>
        <span className="mono text-[var(--paper)] ml-auto" aria-live="polite">
          {shown ? `${FEATURE[shown.feature] ?? shown.feature}: ${fmt(shown.kg)} kg` : "kg vs model baseline"}
        </span>
      </div>
      <svg width={W} height={H} role="img" className="block mt-2"
        aria-label={`Diverging bar chart of SHAP contributions in kg relative to the ${kg(base)} kg baseline, summing to ${kg(pred)} kg: ${contrib.map((c) => `${FEATURE[c.feature] ?? c.feature} ${fmt(c.kg)}`).join(", ")}.`}>
        <line x1={zero} x2={zero} y1={T - 4} y2={H - 20} stroke="var(--paper-soft)" />
        <text x={zero} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--paper-soft)">0 (baseline)</text>
        {contrib.map((c, k) => {
          const yy = T + k * rowH;
          const l = len(c.kg);
          const pos = c.kg >= 0;
          const bx = pos ? zero : zero - l;
          return (
            <g key={c.feature} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}>
              <rect x={0} y={yy} width={W} height={rowH} fill="transparent" />
              <text x={0} y={yy + 15} fontSize={12} fill="var(--paper)">{FEATURE[c.feature] ?? c.feature}</text>
              <text x={0} y={yy + 28} fontSize={11} fill="var(--paper-soft)" className="mono">{isNum(c.value) ? `${kg(c.value, c.unit === "kt" ? 1 : 0)} ${c.unit ?? ""}` : ""}</text>
              <rect x={bx} y={yy + 7} width={Math.max(1, l)} height={rowH - 14} fill={pos ? SERIES[1] : SERIES[0]} opacity={hover && hover !== c ? 0.55 : 1} />
              <text x={pos ? bx + l + 5 : bx - 5} y={yy + rowH / 2 + 4} textAnchor={pos ? "start" : "end"} fontSize={12} fill="var(--paper)" className="mono">{fmt(c.kg)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------------- Metrics ---------------- */

function Metrics({ data }: { data: DemoData }) {
  const ts: Record<string, Metric> = data.metrics?.time_split ?? {};
  const rs: Record<string, Metric> = data.metrics?.route_split ?? {};
  const primary: string = data.model?.name ?? "trend_xgboost";
  const names = Array.from(new Set([...Object.keys(ts), ...Object.keys(rs)]));
  const p = ts[primary] ?? {}, pr = rs[primary] ?? {};
  const audit = arr<Audit>(data.whatifAudit?.summary);
  const info = data.metrics?.time_split_info ?? {};
  const fmtPct = (v: unknown) => (isNum(v) ? `${v.toFixed(1)}%` : "—");
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        <Stat label="MAE (time split)" value={`${kg(p.mae_kg)} kg`} sub={MODEL[primary] ?? primary} />
        <Stat label="MAPE (time split)" value={fmtPct(p.mape_pct)} />
        <Stat label="R² (time split)" value={isNum(p.r2) ? p.r2.toFixed(3) : "—"} />
        <Stat label="MAPE (route held out)" value={fmtPct(pr.mape_pct)} sub={isNum(pr.mae_kg) ? `MAE ${kg(pr.mae_kg)} kg` : undefined} />
      </div>
      {names.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full small min-w-[560px]">
            <caption className="text-left text-[var(--paper-soft)] pb-2">
              Time split: train through <span className="mono">{info.train_until ?? "—"}</span>, test from <span className="mono">{info.test_from ?? "—"}</span>. Route split: each city pair held out in turn.
            </caption>
            <thead className="text-[var(--paper-soft)]">
              <tr><th scope="col" className="text-left font-normal py-1 pr-2">Model</th><th scope="col" className="text-right font-normal px-2">MAE kg</th><th scope="col" className="text-right font-normal px-2">MAPE</th><th scope="col" className="text-right font-normal px-2">R²</th><th scope="col" className="text-right font-normal px-2">Held-out route MAE kg</th><th scope="col" className="text-right font-normal pl-2">MAPE</th></tr>
            </thead>
            <tbody>
              {names.map((n) => {
                const a = ts[n] ?? {}, b = rs[n] ?? {};
                const isP = n === primary;
                return (
                  <tr key={n} style={{ borderTop: "1px solid var(--line-dark)", background: isP ? "var(--night)" : undefined }}>
                    <th scope="row" className="text-left font-normal py-1.5 pr-2">{MODEL[n] ?? n}{isP && <span className="text-[var(--paper-soft)]"> · primary</span>}</th>
                    <td className="mono text-right px-2">{kg(a.mae_kg)}</td>
                    <td className="mono text-right px-2">{fmtPct(a.mape_pct)}</td>
                    <td className="mono text-right px-2">{isNum(a.r2) ? a.r2.toFixed(3) : "—"}</td>
                    <td className="mono text-right px-2">{kg(b.mae_kg)}</td>
                    <td className={`mono text-right pl-2 ${isNum(b.mape_pct) && b.mape_pct > 20 ? "text-[var(--neg)]" : ""}`}>{fmtPct(b.mape_pct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="small text-[var(--paper-soft)] mt-2">Plain tree models do well when every route is in training but fall apart on an unseen route; the linear trend plus residual model keeps the error low in both.</p>
        </div>
      )}
      <Parity data={data} />
      {audit.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full small min-w-[520px]">
            <caption className="text-left text-[var(--paper-soft)] pb-2">What-if audit: model answers re-flown through the OpenAP physics model</caption>
            <thead className="text-[var(--paper-soft)]"><tr><th scope="col" className="text-left font-normal py-1">Scenario</th><th scope="col" className="text-right font-normal px-2">Flights</th><th scope="col" className="text-right font-normal px-2">Physics mean Δ kg</th><th scope="col" className="text-right font-normal px-2">Model mean Δ kg</th><th scope="col" className="text-right font-normal pl-2">Same sign</th></tr></thead>
            <tbody>
              {audit.map((r) => (
                <tr key={r.scenario} style={{ borderTop: "1px solid var(--line-dark)" }}>
                  <th scope="row" className="text-left font-normal py-1.5">{r.scenario}</th>
                  <td className="mono text-right px-2">{r.n ?? "—"}</td>
                  <td className="mono text-right px-2">{kg(r.physics_mean_delta_kg, 2)}</td>
                  <td className="mono text-right px-2">{kg(r.model_mean_delta_kg, 2)}</td>
                  <td className="mono text-right pl-2">{isNum(r.sign_agreement) ? `${Math.round(r.sign_agreement * 100)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Parity({ data }: { data: DemoData }) {
  const pts = arr<Parity>(data.parityTest).filter((p) => p && isNum(p.label) && isNum(p.pred));
  const [ref, W0] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<Parity | null>(null);
  const order = arr<Route>(data.whatIfGrid?.routes).map((r) => r.route);
  const seen = Array.from(new Set(pts.map((p) => p.route)));
  const routes = [...order.filter((r) => seen.includes(r)), ...seen.filter((r) => !order.includes(r))];
  if (!pts.length) return null;
  const W = Math.min(W0, 520), H = W, L = 52, B = 34, T = 10, R = 10;
  const all = pts.flatMap((p) => [p.label, p.pred]);
  const tk = ticks(Math.min(...all), Math.max(...all), 5);
  const v0 = Math.min(tk[0], ...all), v1 = Math.max(tk[tk.length - 1], ...all);
  const x = (v: number) => L + ((v - v0) / (v1 - v0)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - v0) / (v1 - v0)) * (H - T - B);
  const color = (r: string) => (routes.indexOf(r) < SERIES.length ? SERIES[routes.indexOf(r)] : OTHER);
  return (
    <div ref={ref}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 small">
        <span className="text-[var(--paper-soft)]">Physics label vs prediction, {pts.length} test-split flights (kg)</span>
        <span className="mono" aria-live="polite">{hover ? `${hover.route} · label ${kg(hover.label)} · predicted ${kg(hover.pred)}` : ""}</span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 small text-[var(--paper-soft)] mt-2">
        {routes.map((r) => <li key={r} className="inline-flex items-center gap-2"><i className="inline-block w-2.5 h-2.5" style={{ background: color(r) }} />{r}</li>)}
      </ul>
      <svg width={W} height={H} role="img" className="block mt-2"
        aria-label={`Scatter plot of ${pts.length} test flights, physics-label fuel on the x axis against predicted fuel on the y axis, coloured by route; points sit close to the diagonal.`}>
        {tk.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line-dark)" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--paper-soft)" className="mono">{kg(t)}</text>
            <text x={x(t)} y={H - 16} textAnchor="middle" fontSize={11} fill="var(--paper-soft)" className="mono">{kg(t)}</text>
          </g>
        ))}
        <text x={W - R} y={H - 2} textAnchor="end" fontSize={11} fill="var(--paper-soft)">physics label</text>
        <line x1={x(v0)} y1={y(v0)} x2={x(v1)} y2={y(v1)} stroke="var(--paper-soft)" strokeDasharray="4 4" />
        {pts.map((p, k) => (
          <circle key={k} cx={x(p.label)} cy={y(p.pred)} r={hover === p ? 6 : 3.5} fill={color(p.route)} fillOpacity={0.8}
            stroke={hover === p ? "var(--paper)" : "none"} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>
    </div>
  );
}
