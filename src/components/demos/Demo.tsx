"use client";
/**
 * Picks the demo for a project. Each demo runs on demo-data/<slug>/data.json, exported
 * from a real run; the frame always says so.
 */
import DemoFrame from "./DemoFrame";
import WhaleTrackerDemo from "./WhaleTrackerDemo";
import QuantflowDemo from "./QuantflowDemo";
import PortfolioOptimizerDemo from "./PortfolioOptimizerDemo";
import StockAgentsDemo from "./StockAgentsDemo";
import EquityDeskDemo from "./EquityDeskDemo";
import CreditRiskDemo from "./CreditRiskDemo";
import SkyfuelDemo from "./SkyfuelDemo";
import SmbRuntimeDemo from "./SmbRuntimeDemo";
import RetailInventoryDemo from "./RetailInventoryDemo";
import TravelAdvisorDemo from "./TravelAdvisorDemo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DemoData = Record<string, any> & { asOf?: string; source?: string };

const DEMOS: Record<string, (p: { data: DemoData }) => React.ReactNode> = {
  "whale-tracker": WhaleTrackerDemo,
  "quantflow": QuantflowDemo,
  "portfolio-optimizer": PortfolioOptimizerDemo,
  "stock-multi-agent": StockAgentsDemo,
  "equity-desk": EquityDeskDemo,
  "credit-risk-sql": CreditRiskDemo,
  "skyfuel-ai": SkyfuelDemo,
  "smb-runtime": SmbRuntimeDemo,
  "retail-inventory": RetailInventoryDemo,
  "travel-advisor": TravelAdvisorDemo,
};

export default function Demo({ slug, data }: { slug: string; data: unknown }) {
  const d = (data ?? {}) as DemoData;
  const Specific = DEMOS[slug];
  return <DemoFrame asOf={d.asOf} source={d.source}>{Specific ? <Specific data={d} /> : null}</DemoFrame>;
}
