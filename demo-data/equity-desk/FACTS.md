# equity-desk — facts for the demo page

## What it does
Equity Desk v3.8 is a local research website. Deterministic Python agents gather SEC and market data, then build a single continuous equity-research report: executive brief, review priorities, business, financial exhibits, valuation vs quote, SWOT, risks and sources/limitations. A vanilla-JS front end renders the report and has a 23-topic "detailed research" workspace with Print / Save PDF.

## Stack
Python 3 (Pydantic, pandas, NumPy, requests, BeautifulSoup/lxml, yfinance), SQLite research memory, a built-in HTTP server (`web_server.py`, port 8765) and a vanilla-JS/HTML/CSS front end (`web_app/`). jsdom tests run on Node. Version 3.8.0.

## Agents / modules
25 agent modules in `agents/`, plus 19 tool modules in `tools/`. System Diagnostics scored 21 agents in the MSFT run. The newer additions are deterministic evidence-synthesis agents (Insight Priority, SWOT, Dashboard Experience), not LLM calls.

## Concrete facts (from code and this run)
- Routing is ticker-independent across 30 common-equity frameworks. MSFT was routed to the `software` framework with peers ORCL, CRM, ADBE, NOW.
- MSFT valuation: FCFF DCF bear/base/bull $195.18 / $322.32 / $541.97 per share (WACC 9.3%), combined with peer quartile multiples. The cross-method range is $184.03–$626.62 vs a stored quote of $503.64. The report labels the range a cross-method envelope, not a target.
- Financial data: 5 fiscal years (FY2022–FY2026, June year-end), 100% statement completeness, 4/4 accounting bridges passed. 33 SEC vs provider conflicts were resolved in favour of SEC, which flags the audit `review_required`.
- Output: research posture "watchlist", 30 ranked review priorities, SWOT with 3 strengths / 0 weaknesses / 4 opportunities / 4 threats (the empty quadrant stays empty instead of being filled with guesses), and 25 Markdown sections. The run took about 6 s.
- Memory baseline for this repo: 90/90 Python tests and 3/3 jsdom tests, all offline.

## How the sample was produced
On 2026-11-19, from a scratch copy of the repo (state/, .git and node_modules excluded; the original was left untouched) using the project's `.venv`: `RESEARCH_DB=<scratch sqlite> python main.py MSFT`. Free data only (SEC EDGAR + Yahoo via yfinance); no API keys. The optional Alpha Vantage adapter was not used. `data.json` is a structured extract that mirrors the website's 8 report sections. The 13 core Markdown sections are embedded, and `report.md` is the full Markdown as produced.

## Known gaps / caveats
- Diagnostics: overall "degraded" (14 ok / 7 degraded / 0 failed). News returned 0 items (`IncompleteRead`). Portfolio Tracking is empty and Portfolio Risk didn't run (no portfolio in a scratch DB, as expected).
- Same-ticker alternate: `alternates/AMD/` holds an AMD run from the same session. AMD has a real data defect: 52/53-week SEC period ends (2024-12-28, 2025-12-27) are duplicated against calendar 12-31 periods. That yields 0% YoY growth, a failed gross-profit bridge (audit "partial") and a DCF of $18–$30 vs a $480 quote. The saved 2026-10-16 report in the repo has the same duplication. For that reason MSFT is the primary sample.
