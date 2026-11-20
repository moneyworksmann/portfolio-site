"use client";
/**
 * Retail Inventory Copilot: stock table with low-stock flags, rule-based reorder suggestions,
 * and the purchase orders raised during a scripted walk-through of the app's own API.
 */
import { useState } from "react";
import type { DemoData } from "./Demo";
import { Stat, Tabs } from "./ui";

type Product = { id: number; sku: string; name: string; category?: string; unit?: string; cost_paise?: number; price_paise?: number; reorder_point?: number; quantity?: number };
type Rec = { product_id: number; sku: string; name: string; on_hand?: number; reorder_point?: number; suggested_qty?: number; reason?: string; method?: string };
type Line = { id: number; product_id: number; ordered?: number; received?: number; unit_cost_paise?: number; product_name?: string; sku?: string };
type PO = { id: number; status?: string; created_by?: string; approved_by?: string | null; created_at?: string; approved_at?: string | null; notes?: string; supplier_name?: string; supplier_id?: number; lines?: Line[] };
type Step = { as?: string; request?: string; status?: number; response?: Record<string, unknown> };
type Supplier = { id: number; name: string; lead_days?: number };

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const inr = (paise: unknown) => (isNum(paise) ? `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—");
const n = (v: unknown) => (isNum(v) ? v.toLocaleString("en-IN") : "—");
const low = (p: { quantity?: number; on_hand?: number; reorder_point?: number }) => {
  const q = p.quantity ?? p.on_hand;
  return isNum(q) && isNum(p.reorder_point) && q <= p.reorder_point;
};

export default function RetailInventoryDemo({ data }: { data: DemoData }) {
  const hasAfter = !!data.afterWalkthrough;
  const [state, setState] = useState<"seeded" | "after">("seeded");
  const snap = (state === "after" && hasAfter ? data.afterWalkthrough : data.seeded) ?? {};
  const dash = snap.dashboard ?? {};
  const products = arr<Product>(snap.products);
  const recs = arr<Rec>(snap.recommendations);
  const costOf = (id: number) => products.find((p) => p.id === id)?.cost_paise ?? arr<Product>(data.seeded?.products).find((p) => p.id === id)?.cost_paise;
  const labels = data.labels ?? {};

  return (
    <div className="space-y-8">
      <p className="small px-3 py-2 text-[var(--paper-soft)]" style={{ border: "1px solid var(--line-dark)" }}>
        <span className="text-[var(--paper)] font-medium">Seed data. </span>
        Products and suppliers are {labels.products_and_suppliers ? String(labels.products_and_suppliers) : "fictional demo data"}. Purchase orders were {labels.purchase_orders ? String(labels.purchase_orders) : "created by a scripted walk-through"}.
      </p>

      {hasAfter && (
        <Tabs label="Shop state" value={state} onChange={setState} options={[["seeded", "As seeded"], ["after", "After the walk-through"]]} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--line-dark)" }}>
        <Stat label="SKUs" value={n(dash.products)} />
        <Stat label="Units on hand" value={n(dash.units)} />
        <Stat label="Book-cost value" value={inr(dash.inventory_value_paise)} sub="on-hand × purchase cost" />
        <Stat label="At or below reorder point" value={n(dash.low_stock)} cls={isNum(dash.low_stock) && dash.low_stock > 0 ? "text-[var(--neg)]" : ""} />
      </div>

      <section aria-labelledby="ri-stock">
        <h3 id="ri-stock" className="h3 mb-3">Stock</h3>
        <div className="overflow-x-auto">
          <table className="w-full small min-w-[640px]">
            <thead className="text-[var(--paper-soft)]">
              <tr>
                <th scope="col" className="text-left font-normal py-1 pl-3">SKU</th>
                <th scope="col" className="text-left font-normal px-2">Product</th>
                <th scope="col" className="text-right font-normal px-2">On hand</th>
                <th scope="col" className="text-right font-normal px-2">Reorder at</th>
                <th scope="col" className="text-left font-normal px-2 w-[120px]"><span className="sr-only">On hand vs reorder point</span></th>
                <th scope="col" className="text-right font-normal px-2">Cost</th>
                <th scope="col" className="text-right font-normal px-2">Price</th>
                <th scope="col" className="text-left font-normal px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isLow = low(p);
                const q = isNum(p.quantity) ? p.quantity : 0;
                const rp = isNum(p.reorder_point) ? p.reorder_point : 0;
                const scale = Math.max(q, rp * 2, 1);
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--line-dark)", boxShadow: isLow ? "inset 3px 0 0 var(--neg)" : undefined, background: isLow ? "var(--night)" : undefined }}>
                    <td className="mono py-2 pl-3">{p.sku}</td>
                    <th scope="row" className="text-left font-normal px-2">{p.name}<span className="block text-[var(--paper-soft)]">{p.category}</span></th>
                    <td className={`mono text-right px-2 ${isLow ? "text-[var(--neg)]" : ""}`}>{n(p.quantity)}</td>
                    <td className="mono text-right px-2">{n(p.reorder_point)}</td>
                    <td className="px-2">
                      <svg width={110} height={14} role="img" aria-label={`${q} on hand against a reorder point of ${rp}`}>
                        <rect x={0} y={3} width={110} height={8} fill="var(--line-dark)" />
                        <rect x={0} y={3} width={(q / scale) * 110} height={8} fill={isLow ? "var(--neg)" : "var(--paper-soft)"} />
                        <line x1={(rp / scale) * 110} x2={(rp / scale) * 110} y1={0} y2={14} stroke="var(--paper)" strokeWidth={2} />
                      </svg>
                    </td>
                    <td className="mono text-right px-2">{inr(p.cost_paise)}</td>
                    <td className="mono text-right px-2">{inr(p.price_paise)}</td>
                    <td className="px-2">{isLow ? <span className="text-[var(--neg)]">Low</span> : <span className="text-[var(--paper-soft)]">OK</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small text-[var(--paper-soft)] mt-2">Bar: units on hand; tick: reorder point.</p>
      </section>

      <section aria-labelledby="ri-recs">
        <h3 id="ri-recs" className="h3 mb-3">Reorder suggestions</h3>
        {recs.length ? (
          <ul className="grid md:grid-cols-3 gap-px" style={{ background: "var(--line-dark)" }}>
            {recs.map((r) => {
              const c = costOf(r.product_id);
              const formula = isNum(r.reorder_point) && isNum(r.on_hand) && isNum(r.suggested_qty) && r.suggested_qty === 2 * r.reorder_point - r.on_hand
                ? `2 × ${r.reorder_point} − ${r.on_hand} on hand = ${r.suggested_qty}` : null;
              return (
                <li key={r.product_id} className="p-4 space-y-2" style={{ background: "var(--night)" }}>
                  <div className="flex items-baseline justify-between gap-2"><span className="font-medium">{r.name}</span><span className="mono small text-[var(--paper-soft)]">{r.sku}</span></div>
                  <div className="mono text-[22px]">Order {n(r.suggested_qty)}</div>
                  {formula && <div className="mono small text-[var(--paper-soft)]">{formula}</div>}
                  {isNum(c) && isNum(r.suggested_qty) && <div className="small text-[var(--paper-soft)]">at cost <span className="mono text-[var(--paper)]">{inr(c * r.suggested_qty)}</span></div>}
                  {r.reason && <p className="small text-[var(--paper-soft)]">{r.reason}</p>}
                  {r.method && <p className="label mono text-[var(--paper-soft)]">{r.method}</p>}
                </li>
              );
            })}
          </ul>
        ) : <p className="text-[var(--paper-soft)]">Nothing at or below its reorder point.</p>}
      </section>

      <PurchaseOrders data={data} />
      <Assistant data={data} />
    </div>
  );
}

function PurchaseOrders({ data }: { data: DemoData }) {
  const pos = arr<PO>(data.afterWalkthrough?.purchase_orders).slice().sort((a, b) => a.id - b.id);
  const steps = arr<Step>(data.walkthrough);
  const suppliers = arr<Supplier>(data.seeded?.suppliers);
  const [sel, setSel] = useState(0);
  if (!pos.length && !steps.length) return null;
  const po = pos[Math.min(sel, pos.length - 1)];
  const lines = arr<Line>(po?.lines).slice().sort((a, b) => a.id - b.id);
  const total = lines.reduce((s, l) => s + (isNum(l.ordered) && isNum(l.unit_cost_paise) ? l.ordered * l.unit_cost_paise : 0), 0);
  const sup = suppliers.find((s) => s.id === po?.supplier_id);
  return (
    <section aria-labelledby="ri-po" className="space-y-4">
      <h3 id="ri-po" className="h3">Purchase orders</h3>
      {pos.length > 0 && (
        <>
          {pos.length > 1 && <Tabs label="Purchase order" value={String(sel)} onChange={(v) => setSel(Number(v))} options={pos.map((p, i) => [String(i), `PO #${p.id}`] as [string, string])} />}
          <div className="p-4 space-y-3" style={{ background: "var(--night)" }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">PO #{po.id} · {po.supplier_name ?? sup?.name ?? "—"}</span>
              <span className={`small mono ${po.status === "rejected" ? "text-[var(--neg)]" : po.status === "pending" ? "" : "text-[var(--pos)]"}`}>{(po.status ?? "—").replace(/_/g, " ")}</span>
            </div>
            <dl className="small grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-[var(--paper-soft)]">
              <dt>Raised by</dt><dd className="text-[var(--paper)]">{po.created_by ?? "—"}{po.created_at ? <span className="mono text-[var(--paper-soft)]"> · {po.created_at.slice(0, 16).replace("T", " ")} UTC</span> : null}</dd>
              <dt>Approved by</dt><dd className="text-[var(--paper)]">{po.approved_by ?? "—"}</dd>
              {sup?.lead_days != null && <><dt>Supplier lead time</dt><dd className="mono text-[var(--paper)]">{sup.lead_days} days</dd></>}
              {po.notes && <><dt>Notes</dt><dd className="text-[var(--paper)]">{po.notes}</dd></>}
            </dl>
            <div className="overflow-x-auto">
              <table className="w-full small min-w-[520px]">
                <thead className="text-[var(--paper-soft)]"><tr><th scope="col" className="text-left font-normal py-1">Item</th><th scope="col" className="text-right font-normal px-2">Ordered</th><th scope="col" className="text-right font-normal px-2">Received</th><th scope="col" className="text-right font-normal px-2">Unit cost</th><th scope="col" className="text-right font-normal pl-2">Line total</th></tr></thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} style={{ borderTop: "1px solid var(--line-dark)" }}>
                      <th scope="row" className="text-left font-normal py-1.5">{l.product_name}<span className="mono text-[var(--paper-soft)]"> {l.sku}</span></th>
                      <td className="mono text-right px-2">{n(l.ordered)}</td>
                      <td className="mono text-right px-2">{n(l.received)}</td>
                      <td className="mono text-right px-2">{inr(l.unit_cost_paise)}</td>
                      <td className="mono text-right pl-2">{isNum(l.ordered) && isNum(l.unit_cost_paise) ? inr(l.ordered * l.unit_cost_paise) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr style={{ borderTop: "1px solid var(--paper-soft)" }}><th scope="row" colSpan={4} className="text-right font-normal py-1.5 px-2 text-[var(--paper-soft)]">Order total</th><td className="mono text-right pl-2">{inr(total)}</td></tr></tfoot>
              </table>
            </div>
          </div>
        </>
      )}
      {steps.length > 0 && (
        <div>
          <h4 className="small text-[var(--paper-soft)] mb-2">Walk-through through the real API (role → request → response)</h4>
          <ol className="space-y-1">
            {steps.map((s, i) => {
              const ok = isNum(s.status) && s.status < 300;
              const detail = s.response ? Object.entries(s.response).map(([k, v]) => `${k}: ${String(v)}`).join(", ") : "";
              return (
                <li key={i} className="grid grid-cols-[64px_1fr] sm:grid-cols-[72px_minmax(0,1fr)_auto] gap-x-3 small px-3 py-1.5" style={{ background: "var(--night)" }}>
                  <span className="text-[var(--paper-soft)]">{s.as}</span>
                  <span className="mono break-all">{s.request}</span>
                  <span className={`mono col-start-2 sm:col-start-auto ${ok ? "text-[var(--pos)]" : "text-[var(--neg)]"}`}>{s.status} <span className="text-[var(--paper-soft)]">{detail}</span></span>
                </li>
              );
            })}
          </ol>
          <p className="small text-[var(--paper-soft)] mt-2">The refusals are the point: a manager can’t approve, staff can’t over-receive or adjust stock.</p>
        </div>
      )}
    </section>
  );
}

function Assistant({ data }: { data: DemoData }) {
  const qa = arr<{ q?: string; answer?: string; mode?: string }>(data.seeded?.assistant);
  if (!qa.length) return null;
  return (
    <details className="p-3" style={{ border: "1px solid var(--line-dark)" }}>
      <summary className="cursor-pointer small">The assistant (deterministic rules, not an LLM)</summary>
      <dl className="mt-3 space-y-3">
        {qa.map((x, i) => (
          <div key={i}>
            <dt className="small text-[var(--paper-soft)]">“{x.q}”</dt>
            <dd className="small mt-1">{x.answer}{x.mode && <span className="mono text-[var(--paper-soft)]"> · {x.mode}</span>}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
