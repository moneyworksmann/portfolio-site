/** Facts about Mann, from the résumé (Patel.Mann-Resume.pdf) and his own answers. Phone number intentionally left out. */
export const ME = {
  name: "Mann Patel",
  email: "mhpatel1836@gmail.com",
  linkedin: "https://www.linkedin.com/in/mann-patel-b3a012298/",
  github: "https://github.com/moneyworksmann",
  school: "Rutgers University–New Brunswick",
  degree: "B.S., Finance and Accounting",
  gpa: "3.7",
  graduating: "December 2026",
  statement: "studies finance and accounting at Rutgers and builds tools that turn market data into decisions.",
  now: [
    { title: "QuantFlow", text: "A point-in-time signal engine for US large caps, built so a backtest can't flatter itself.", href: "/work/quantflow" },
    { title: "Paper trading", text: "A paper-only intraday simulator where AI reviewers check every trade idea before it's placed. No real money." },
    { title: "An MCP server", text: "Building a Model Context Protocol (MCP) server, the standard way to give AI assistants new tools." },
  ],
};

export const EXPERIENCE = [
  { org: "Rutgers Health and Recreation", role: "Business Office Assistant", when: "May–Aug 2025", where: "Piscataway, NJ",
    points: ["Built financial reports in Oracle ERP for budget forecasting", "Reviewed budget inputs in Oracle EPBCS and ran variance analysis against actuals", "Reconciled insurance payments and pending transactions with insurers"] },
  { org: "Rutgers Recreation", role: "Building Supervisor", when: "Aug 2023–present", where: "Piscataway, NJ",
    points: ["Run operations for facilities serving 1,000+ patrons", "Supervise a team of 4+ staff on membership sales and access"] },
  { org: "Beta Alpha Psi — VITA", role: "Tax Volunteer", when: "Feb–Apr 2025", where: "New Brunswick, NJ",
    points: ["Prepared and e-filed returns for 50+ households", "Advised on credits and deductions; reviewed final tax packages"] },
  { org: "Rutgers Learning Center", role: "Peer Tutor", when: "Jan 2024–May 2025", where: "New Brunswick, NJ",
    points: ["Tutored Calculus and Economics; students improved about 8% on average"] },
];

export const COURSEWORK = ["Investment Analysis", "Corporate Finance", "Intermediate Accounting I & II", "Concepts of Auditing", "Financial Management", "Accounting Information Systems"];
export const SKILLS = {
  Quantitative: ["Probability", "Time-series analysis", "Regression", "Risk modelling"],
  Tools: ["Python", "SQL (MySQL, SQLite, DuckDB)", "R", "Excel (pivot tables, VBA)", "TypeScript / Next.js", "Oracle ERP & EPBCS"],
  Markets: ["Equities", "Derivatives", "Corporate finance", "13F / SEC filings"],
};
