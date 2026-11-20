/**
 * One record per public project. Text comes from each project's README; figures in the
 * demos come from real runs exported to demo-data/<slug>/ (see each FACTS.md).
 */
export type Project = {
  slug: string;
  title: string;
  group: "Finance & data" | "AI agents";
  oneLine: string;
  brief: string;
  built: string[];
  stack: string[];
  learned?: string;
  featured?: boolean;
};

export const PROJECTS: Project[] = [
  {
    slug: "whale-tracker", title: "Whale Tracker", group: "Finance & data", featured: true,
    oneLine: "Follow what famous investors own, quarter by quarter, from their SEC 13F filings.",
    brief: "Big funds disclose their US stock holdings every quarter in 13F filings, but the raw filings are hard to read and harder to compare. Whale Tracker turns them into a portfolio view per fund, every quarter-over-quarter move, and what several funds own in common.",
    built: [
      "Ingests 13F filings from SEC EDGAR for any of the ~10,000 managers that filed in the past year, on demand.",
      "Maps CUSIPs to tickers (OpenFIGI), adds prices (Cboe) and sector codes (SEC), all from free sources.",
      "Shows new, added, reduced and exited positions, overlap between funds, and sector mix.",
      "Runs as a Next.js app on a SQLite database, published from a Mac through a Cloudflare tunnel.",
    ],
    stack: ["Next.js", "TypeScript", "SQLite", "SEC EDGAR", "Recharts"],
  },
  {
    slug: "quantflow", title: "QuantFlow", group: "Finance & data", featured: true,
    oneLine: "A multi-strategy signal engine for US large caps, designed so a backtest can't lie to you.",
    brief: "QuantFlow resolves a point-in-time universe (S&P 500 ∪ Nasdaq 100), runs independent strategy sleeves over it, blends them, and emits a small number of vetted, sized, timestamped signals. Execution is a pluggable sink, so moving from a human reading Discord to paper trading needs no change to strategy code.",
    built: [
      "Point-in-time index membership, so delisted and removed stocks stay in history (no survivorship bias).",
      "Independent strategy sleeves blended into one ranked signal list.",
      "Incremental bar ingestion into DuckDB/Parquet; honest, out-of-sample measurement.",
    ],
    stack: ["Python", "pandas", "NumPy", "DuckDB"],
  },
  {
    slug: "stock-multi-agent", title: "Equity research agents", group: "AI agents", featured: true,
    oneLine: "Sixteen cooperating agents turn a ticker into a thesis-led research report.",
    brief: "A local Python system where specialised agents (financials, valuation, industry, macro, filings, earnings, news, risk, thesis) each own one part of the analysis and a central orchestrator assembles a typed research graph, a Markdown report and machine-readable JSON. It runs on free, public data with no paid model API.",
    built: [
      "16 agents plus an orchestrator, each with a typed contract for its inputs and outputs.",
      "DCF with scenarios and sensitivity, peer multiples, five fiscal years, a data-reliability audit.",
      "Thesis pillars, debates, catalysts and explicit falsifiers in the final report.",
    ],
    stack: ["Python", "pandas", "yfinance", "SEC EDGAR"],
  },
  {
    slug: "equity-desk", title: "Equity Desk", group: "Finance & data",
    oneLine: "A research website that reads like an analyst's report: brief, valuation, scenarios, risks.",
    brief: "Equity Desk presents company research as a continuous report rather than an agent dashboard: an executive brief, a valuation range against the current quote, scenario comparisons, SWOT, risks and financial exhibits, with the underlying evidence one click away.",
    built: [
      "Executive brief with a company snapshot and a conditional valuation range.",
      "Valuation methods compared side by side; bear, base and bull DCF scenarios.",
      "Separates missing data from real economic concerns, and audits SEC data against market data providers.",
    ],
    stack: ["Python", "SEC EDGAR", "yfinance", "HTML/CSS"],
  },
  {
    slug: "credit-risk-sql", title: "Credit-risk SQL pipeline", group: "Finance & data", featured: true,
    oneLine: "Messy consumer-loan records in, a clean database and default-risk summaries out, all in SQL.",
    brief: "An end-to-end data-cleaning and analytics pipeline on Lending Club–style loan data. Every cleaning, join and aggregation step happens in SQL; Python is only the harness and the charts.",
    built: [
      "Deduplicates loans and borrowers with ROW_NUMBER() window functions.",
      "Casts \"13.5%\" and \" 36 months\" strings, normalises casing, parses mixed date formats.",
      "Imputes missing income with a median computed in SQL and caps outliers at the 99th percentile.",
      "Default rates by grade, term and income bucket.",
    ],
    stack: ["SQL", "SQLite", "Python", "matplotlib"],
  },
  {
    slug: "portfolio-optimizer", title: "Portfolio optimizer", group: "Finance & data",
    oneLine: "Upload holdings, see the efficient frontier and better-diversified weights.",
    brief: "A Flask web app that analyses a stock portfolio: risk and return of the current mix, the efficient frontier, and optimised weights.",
    built: ["Mean-variance analysis on historical returns.", "Efficient frontier and optimised weights next to the current portfolio."],
    stack: ["Python", "Flask", "pandas", "NumPy"],
  },
  {
    slug: "travel-advisor", title: "Multi-agent travel advisor", group: "AI agents",
    oneLine: "Describe a trip in plain English; ten agents plan it and a checker verifies it.",
    brief: "An orchestrator turns a plain-English request into a trip spec. Agents search flights across the whole date window and research stays, places, food, nightlife and conditions in parallel waves; a synthesiser builds a day-by-day plan and a deterministic verifier checks it before you see it.",
    built: [
      "Agents run in dependency waves, in parallel where they can.",
      "A deterministic verifier rejects plans with errors and triggers one retry.",
      "A step-by-step Streamlit planner and a picture-led results page with booking links.",
    ],
    stack: ["Python", "Streamlit", "Claude API"],
  },
  {
    slug: "skyfuel-ai", title: "SkyFuel AI", group: "AI agents",
    oneLine: "An explainable ML stand-in for a physics model of flight fuel burn and CO₂.",
    brief: "A physics engine (OpenAP) is accurate but slow. SkyFuel trains a model on its output to answer what-if questions (cruise altitude, payload) in milliseconds, and explains every answer with SHAP.",
    built: [
      "ADS-B trajectories labelled by OpenAP physics, phase by phase.",
      "Five planning-time features; a linear trend plus XGBoost, split by time and route.",
      "SHAP explanation per flight; CO₂ = 3.16 × fuel.",
    ],
    stack: ["Python", "XGBoost", "SHAP", "DuckDB", "Streamlit"],
  },
  {
    slug: "smb-runtime", title: "SMB agent runtime", group: "AI agents",
    oneLine: "One runtime that runs AI assistants for fourteen kinds of small business, with humans in control.",
    brief: "An agent runtime built from a written specification: an event queue, per-tenant context, tool scoping, schema validation, an audit log, token caps and a kill switch. Agents triage messages, score urgency, draft replies for human approval, send reminders and propose slots. What differs per business is configuration, not code.",
    built: [
      "Runtime guards first: tool scoping, schema validation, audit log, caps and a kill switch.",
      "Replies are drafted, never sent, until a person approves.",
      "Stages delivered in order of value per unit of risk.",
    ],
    stack: ["Python", "FastAPI"],
  },
  {
    slug: "retail-inventory", title: "Retail inventory copilot", group: "AI agents",
    oneLine: "Inventory and purchasing for small retailers, with reorder suggestions you can explain.",
    brief: "A standalone inventory and procurement app for small shops in India: stock levels, suppliers, purchase orders and rule-based reorder recommendations that say why.",
    built: ["Role-based access for owner and manager.", "Rule-based reorder recommendations with reasons.", "Purchase orders and supplier records."],
    stack: ["Python", "FastAPI", "SQLite"],
  },
];

export const getProject = (slug: string) => PROJECTS.find((p) => p.slug === slug);
