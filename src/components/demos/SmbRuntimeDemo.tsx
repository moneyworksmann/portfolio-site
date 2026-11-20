"use client";
/**
 * SMB Agent Runtime: step through a recorded flow. Incoming message, each agent's decision with
 * its guard checks, the hash-chained audit rows, and where the reply ended up. Agent outputs come
 * from the rule-based stub provider, not an LLM, and the demo says so.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import type { DemoData } from "./Demo";
import { Stat } from "./ui";

type Run = { id: number; agent: string; tokens_in?: number; tokens_out?: number; latency_ms?: number; valid?: boolean; validation_error?: string | null; model?: string; prompt?: string; output?: Record<string, unknown> };
type Decision = { id: number; run_id: number; kind?: string; intent?: string | null; draft?: string | null; guard_verdict?: string | null; guard_violations?: { verdict?: string; violations?: unknown[] } | null; escalation_reason?: string | null; a2_level?: string | null; outcome?: string };
type Outbound = { to?: string; channel?: string; state?: string; body?: string };
type AuditRow = { id: number; at?: string; actor?: string; action?: string; subject?: string; prev_hash?: string; hash?: string; data?: Record<string, unknown> };
type Flow = { title?: string; incoming?: { channel?: string; from?: string; sender_name?: string; body?: string }; agentRuns?: Run[]; decisions?: Decision[]; outbound?: Outbound[]; auditLog?: AuditRow[] };
type Readiness = { intent: string; auto?: boolean; eligible?: boolean; reason?: string };

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const AGENT: Record<string, string> = { A1: "Triage", A2: "Urgency", A3: "Slot Proposer", A4: "Reply Copilot", A5: "Reminders", A6: "Review Requester", A7: "Recurrence", A8: "Analyst" };
const human = (s: unknown) => (typeof s === "string" ? s.replace(/_/g, " ") : "—");

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

type Step = { kind: "incoming" | "agent" | "outcome"; run?: Run; decisions: Decision[]; audit: AuditRow[] };

function buildSteps(f: Flow): Step[] {
  const runs = arr<Run>(f.agentRuns);
  const decs = arr<Decision>(f.decisions);
  const audit = arr<AuditRow>(f.auditLog);
  const used = new Set<number>();
  const steps: Step[] = [{ kind: "incoming", decisions: [], audit: [] }];
  for (const r of runs) {
    const ds = decs.filter((d) => d.run_id === r.id);
    const subj = new Set([`agent_run:${r.id}`, ...ds.map((d) => `decision:${d.id}`)]);
    const rows = audit.filter((a) => a.subject && subj.has(a.subject) && !used.has(a.id));
    rows.forEach((a) => used.add(a.id));
    steps.push({ kind: "agent", run: r, decisions: ds, audit: rows });
  }
  steps.push({ kind: "outcome", decisions: decs, audit: audit.filter((a) => !used.has(a.id)) });
  return steps;
}

const btn = "h-9 px-3 small disabled:opacity-45";
const outline = { border: "1px solid var(--line-dark)", color: "var(--paper)" } as const;

export default function SmbRuntimeDemo({ data }: { data: DemoData }) {
  const flows = arr<Flow>(data.flows);
  const [fi, setFi] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const flow = flows[Math.min(fi, Math.max(0, flows.length - 1))] ?? {};
  const steps = buildSteps(flow);
  const last = steps.length - 1;
  const cur = Math.min(step, last);

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      setStep((s) => {
        if (s >= last) { setPlaying(false); return s; }
        return s + 1;
      });
    }, 1800);
    return () => window.clearInterval(t);
  }, [playing, last]);

  if (!flows.length) return <p className="text-[var(--paper-soft)]">No recorded flows in this export.</p>;

  const tenant = data.tenant ?? {};
  const whitelist = arr<string>(tenant.whitelist);
  const usage = data.sandboxStateAfter?.metrics?.usage ?? {};
  const chain = data.auditChain ?? {};
  const shownAudit = steps.slice(0, cur + 1).flatMap((s) => s.audit);

  const pick = (i: number) => { setFi(i); setStep(0); setPlaying(false); };

  return (
    <div className="space-y-6">
      <p className="small px-3 py-2 text-[var(--paper-soft)]" style={{ border: "1px solid var(--line-dark)" }}>
        <span className="text-[var(--paper)] font-medium">Recorded with a stub, not a model. </span>
        {data.modelNote ? String(data.modelNote) : "Agent outputs come from a keyword-rule stub provider."}
        {tenant.name ? <> The clinic ({String(tenant.name)}) and customer are fictional seed data; the phone number is masked.</> : null}
      </p>

      <fieldset>
        <legend className="small text-[var(--paper-soft)] mb-2">Pick a recorded flow</legend>
        <div className="grid sm:grid-cols-2 gap-2">
          {flows.map((f, i) => (
            <button key={i} type="button" aria-pressed={i === fi} onClick={() => pick(i)}
              className="text-left p-3 small" style={i === fi ? { background: "var(--paper)", color: "var(--night)" } : outline}>
              <span className="mono mr-2">{String(i + 1).padStart(2, "0")}</span>{f.title ?? `Flow ${i + 1}`}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} style={outline} onClick={() => { setPlaying(false); setStep(Math.max(0, cur - 1)); }} disabled={cur === 0}>← Back</button>
        <button type="button" className={btn} style={{ background: "var(--paper)", color: "var(--night)" }}
          onClick={() => { if (cur >= last) setStep(0); setPlaying((p) => !p); }} aria-pressed={playing}>
          {playing ? "Pause" : cur >= last ? "Replay" : "Play"}
        </button>
        <button type="button" className={btn} style={outline} onClick={() => { setPlaying(false); setStep(Math.min(last, cur + 1)); }} disabled={cur >= last}>Next →</button>
        <span className="small mono text-[var(--paper-soft)] ml-auto" aria-live="polite">Step {cur + 1} / {steps.length}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_minmax(0,380px)] gap-6">
        <ol className="space-y-3 min-w-0">
          {steps.slice(0, cur + 1).map((s, i) => (
            <li key={i} className={reduced ? "" : "smb-in"} style={{ background: "var(--night)", borderLeft: `2px solid ${i === cur ? "var(--paper)" : "var(--line-dark)"}` }}>
              {s.kind === "incoming" && <Incoming flow={flow} />}
              {s.kind === "agent" && s.run && <AgentStep run={s.run} decisions={s.decisions} whitelist={whitelist} />}
              {s.kind === "outcome" && <Outcome flow={flow} whitelist={whitelist} />}
            </li>
          ))}
        </ol>

        <div className="space-y-4 min-w-0">
          <div>
            <h3 className="small text-[var(--paper-soft)] mb-2">Audit log (hash-chained), rows written so far</h3>
            <div className="overflow-x-auto" style={{ background: "var(--night)" }}>
              <table className="w-full small mono min-w-[340px]">
                <thead className="text-[var(--paper-soft)]"><tr><th scope="col" className="text-left font-normal px-2 py-1">#</th><th scope="col" className="text-left font-normal px-2">actor</th><th scope="col" className="text-left font-normal px-2">action</th><th scope="col" className="text-left font-normal px-2">prev → hash</th></tr></thead>
                <tbody>
                  {shownAudit.length ? shownAudit.map((a) => (
                    <tr key={a.id} style={{ borderTop: "1px solid var(--line-dark)" }} title={a.subject}>
                      <td className="px-2 py-1">{a.id}</td><td className="px-2">{a.actor}</td><td className="px-2">{a.action}</td>
                      <td className="px-2 text-[var(--paper-soft)] whitespace-nowrap">{(a.prev_hash || "∅").slice(0, 6)} → <span className="text-[var(--paper)]">{(a.hash ?? "").slice(0, 6)}</span></td>
                    </tr>
                  )) : <tr><td colSpan={4} className="px-2 py-2 text-[var(--paper-soft)]">Nothing written yet: the message is only accepted.</td></tr>}
                </tbody>
              </table>
            </div>
            {typeof chain.intact === "boolean" && (
              <p className="small text-[var(--paper-soft)] mt-2">
                Chain check across all recorded flows: <span className={chain.intact ? "text-[var(--pos)]" : "text-[var(--neg)]"}>{chain.intact ? "intact" : `broken at ${chain.broken_at}`}</span>
                {data.sandboxStateAfter?.metrics?.audit_rows != null && <> · <span className="mono">{data.sandboxStateAfter.metrics.audit_rows}</span> rows</>}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-px" style={{ background: "var(--line-dark)" }}>
            <Stat label="Model spend cap / day" value={usage.token_cap_inr != null ? `₹${usage.token_cap_inr}` : "—"} sub={usage.spend_inr != null ? `₹${usage.spend_inr} estimated used` : undefined} />
            <Stat label="Message cap / day" value={usage.message_cap != null ? String(usage.message_cap) : "—"} sub={usage.messages_sent != null ? `${usage.messages_sent} sent` : undefined} />
          </div>
          <p className="small text-[var(--paper-soft)]">Auto-send whitelist: {whitelist.length ? whitelist.map((w) => <span key={w} className="mono text-[var(--paper)] mr-2">{w}</span>) : "none"}</p>
        </div>
      </div>

      <Extras data={data} />
      <style>{`@keyframes smbIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}.smb-in{animation:smbIn .35s ease-out}@media (prefers-reduced-motion: reduce){.smb-in{animation:none}}`}</style>
    </div>
  );
}

function Head({ tag, title, sub }: { tag: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="label mono px-1.5 py-0.5" style={{ border: "1px solid var(--line-dark)" }}>{tag}</span>
      <span className="font-medium">{title}</span>
      {sub && <span className="small text-[var(--paper-soft)]">{sub}</span>}
    </div>
  );
}

function Incoming({ flow }: { flow: Flow }) {
  const m = flow.incoming ?? {};
  return (
    <div className="p-4 space-y-2">
      <Head tag="IN" title={`Incoming ${m.channel ?? "message"}`} sub={[m.sender_name, m.from].filter(Boolean).join(" · ")} />
      <blockquote className="px-3 py-2" style={{ background: "var(--night-2)" }}>{m.body ?? "—"}</blockquote>
    </div>
  );
}

function Check({ ok, label, value }: { ok: boolean | null; label: string; value: string }) {
  return (
    <li className="flex gap-2 small">
      <span aria-hidden className={ok == null ? "text-[var(--paper-soft)]" : ok ? "text-[var(--pos)]" : "text-[var(--neg)]"}>{ok == null ? "•" : ok ? "✓" : "✕"}</span>
      <span className="text-[var(--paper-soft)]">{label}:</span>
      <span className="mono break-all">{value}</span>
      <span className="sr-only">{ok == null ? "" : ok ? "(pass)" : "(flagged)"}</span>
    </li>
  );
}

function AgentStep({ run, decisions, whitelist }: { run: Run; decisions: Decision[]; whitelist: string[] }) {
  const o = run.output ?? {};
  const facts: [string, string][] = [];
  if (o.intent) facts.push(["intent", String(o.intent)]);
  if (o.level) facts.push(["urgency", String(o.level)]);
  if (o.language) facts.push(["language", String(o.language)]);
  if (typeof o.confidence === "number") facts.push(["confidence", (o.confidence as number).toFixed(2)]);
  const signals = arr<string>(o.matched_signals);
  if (signals.length) facts.push(["matched signals", signals.join(", ")]);
  const missing = arr<string>(o.missing);
  return (
    <div className="p-4 space-y-3">
      <Head tag={run.agent} title={AGENT[run.agent] ?? "Agent"} sub={`${run.model ?? "stub"} · ${run.tokens_in ?? "—"} in / ${run.tokens_out ?? "—"} out tokens (estimate)`} />
      {facts.length > 0 && (
        <dl className="flex flex-wrap gap-x-5 gap-y-1 small">
          {facts.map(([k, v]) => <div key={k}><dt className="inline text-[var(--paper-soft)]">{k} </dt><dd className="inline mono">{v}</dd></div>)}
        </dl>
      )}
      {typeof o.draft === "string" && <blockquote className="px-3 py-2 small" style={{ background: "var(--night-2)" }}>Draft: {o.draft}</blockquote>}
      <ul className="space-y-1">
        <Check ok={run.valid !== false} label="output schema" value={run.valid === false ? `invalid${run.validation_error ? `: ${run.validation_error}` : ""}` : "valid"} />
        <Check ok={!o.escalate} label="escalate" value={o.escalate ? `yes, ${human(o.reason)}` : "no"} />
        {missing.length > 0 && <Check ok={false} label="missing facts" value={missing.join("; ")} />}
        {decisions.map((d) => (
          <li key={d.id} className="pt-1">
            <ul className="space-y-1">
              <Check ok={null} label={`decision ${d.id}`} value={`${human(d.kind)} → ${d.outcome ?? "—"}`} />
              {d.guard_verdict && <Check ok={d.guard_verdict === "pass"} label="guard" value={`${d.guard_verdict}${arr(d.guard_violations?.violations).length ? ` (${arr<unknown>(d.guard_violations?.violations).map(String).join(", ")})` : ", no violations"}`} />}
              {d.draft && d.intent && <Check ok={whitelist.includes(d.intent)} label="auto-send whitelist" value={whitelist.includes(d.intent) ? `${d.intent} is whitelisted` : `${d.intent} is not whitelisted`} />}
              {d.escalation_reason && <Check ok={false} label="escalation" value={human(d.escalation_reason)} />}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Outcome({ flow, whitelist }: { flow: Flow; whitelist: string[] }) {
  const decs = arr<Decision>(flow.decisions);
  const out = arr<Outbound>(flow.outbound);
  const pending = decs.filter((d) => d.draft && d.outcome === "open");
  const sent = out.filter((o) => o.to === "customer");
  const staff = out.filter((o) => o.to === "staff");
  return (
    <div className="p-4 space-y-3">
      <Head tag="OUT" title="Where the reply went" />
      {sent.map((o, i) => (
        <div key={`s${i}`} className="space-y-2">
          <p className="small"><span className="text-[var(--pos)]">Auto-sent</span> to the customer ({o.state ?? "queued"}), because the intent is on the whitelist ({whitelist.join(", ") || "—"}) and the guard passed.</p>
          <blockquote className="px-3 py-2 small whitespace-pre-wrap" style={{ background: "var(--night-2)" }}>{o.body}</blockquote>
        </div>
      ))}
      {staff.map((o, i) => (
        <div key={`a${i}`} className="space-y-2">
          <p className="small"><span className="text-[var(--neg)]">Staff alert queued.</span> No customer draft was written, by design.</p>
          <pre className="px-3 py-2 small mono whitespace-pre-wrap" style={{ background: "var(--night-2)" }}>{(o.body ?? "").replace(/\+\d{6,}/g, (m) => m.slice(0, 3) + "XXXXXX" + m.slice(-4))}</pre>
        </div>
      ))}
      {pending.map((d) => (
        <div key={d.id} className="space-y-2">
          <p className="small"><span className="font-medium">Awaiting human approval</span> <span className="text-[var(--paper-soft)]">· {human(d.escalation_reason)} · guard {d.guard_verdict ?? "—"}</span></p>
          <blockquote className="px-3 py-2 small" style={{ background: "var(--night-2)" }}>{d.draft}</blockquote>
          <div className="flex gap-2">
            <button type="button" disabled className="h-9 px-3 small opacity-45 cursor-not-allowed" style={{ background: "var(--paper)", color: "var(--night)" }}>Approve (demo)</button>
            <button type="button" disabled className="h-9 px-3 small opacity-45 cursor-not-allowed" style={outline}>Edit (demo)</button>
          </div>
          <p className="small text-[var(--paper-soft)]">Buttons are disabled here; in the runtime only a person in the approval queue can release this draft.</p>
        </div>
      ))}
      {!sent.length && !staff.length && !pending.length && <p className="small text-[var(--paper-soft)]">Nothing was sent.</p>}
    </div>
  );
}

function Extras({ data }: { data: DemoData }) {
  const ready = arr<Readiness>(data.sandboxStateAfter?.readiness);
  const scripted = data.scriptedGuardDemo;
  return (
    <div className="space-y-3">
      {ready.length > 0 && (
        <details className="p-3" style={{ border: "1px solid var(--line-dark)" }}>
          <summary className="cursor-pointer small">Auto-send readiness by intent (after these flows)</summary>
          <div className="overflow-x-auto mt-3">
            <table className="w-full small min-w-[440px]">
              <thead className="text-[var(--paper-soft)]"><tr><th scope="col" className="text-left font-normal py-1">Intent</th><th scope="col" className="text-left font-normal px-2">Whitelisted</th><th scope="col" className="text-left font-normal px-2">Eligible</th><th scope="col" className="text-left font-normal">Reason</th></tr></thead>
              <tbody>
                {ready.map((r) => (
                  <tr key={r.intent} style={{ borderTop: "1px solid var(--line-dark)" }}>
                    <th scope="row" className="text-left font-normal mono py-1.5">{r.intent}</th>
                    <td className="px-2">{r.auto ? "yes" : "no"}</td>
                    <td className={`px-2 ${r.eligible ? "text-[var(--pos)]" : ""}`}>{r.eligible ? "yes" : "no"}</td>
                    <td className="text-[var(--paper-soft)]">{r.reason ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {scripted?.stdout && (
        <details className="p-3" style={{ border: "1px solid var(--line-dark)" }}>
          <summary className="cursor-pointer small">Scripted guard demo: an invented opening-hours draft gets blocked</summary>
          <p className="small text-[var(--paper-soft)] mt-3"><span className="text-[var(--paper)] font-medium">Scripted. </span>{String(scripted.label ?? "Model replies here are hand-written fixtures.")}</p>
          <pre className="mt-3 p-3 small mono overflow-x-auto max-h-[420px]" style={{ background: "var(--night)" }}>{String(scripted.stdout)}</pre>
        </details>
      )}
      {data.testRun && <p className="small text-[var(--paper-soft)]">Tests: <span className="mono">{String(data.testRun)}</span></p>}
    </div>
  );
}
