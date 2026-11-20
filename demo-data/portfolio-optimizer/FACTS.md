# Portfolio Optimizer (Portfolio Intelligence) — demo facts

**What it does.** A Flask app that takes a list of holdings (from a brokerage CSV, Excel, PDF, Google Sheet, screenshot via OCR, or typed in), values it at live prices, and finds the maximum-Sharpe allocation with Markowitz mean-variance. It also scores the portfolio's risk from 0 to 100 with PRISM: sector diversification, correlation, volatility and single-name concentration.

**Stack.** Python, Flask, pandas, NumPy, SciPy (SLSQP), yfinance, Chart.js front end; Vercel `wsgi.py` entrypoint. Code lives in the "Personal Investment Tracker" repo (`portfolio-intelligence/`), not under Personal Projects.

## Facts from the code
- Optimiser: SLSQP maximising Sharpe on the trailing 1 year of daily returns (251 returns from 252 closes), long-only, fully invested, with a per-name cap of max(25%, 1/n) (`core/optimizer.py`).
- PRISM averages four sub-scores, unweighted, over 5 years of returns: inverted sector HHI (F), average pairwise correlation (I), volatility mapped across a 10–40% band (N), and largest position (E) (`core/prism.py`).
- One 5-year `MarketData` download feeds valuation, the optimiser and PRISM, so the three panels always describe the same weights. The README says the merge cut a request from six downloads to three cold and one warm.

## Facts from this run (sample = the project's built-in "3-Fund Portfolio": VTI 60 / VXUS 20 / BND 20, $100k)
- Current mix: expected return 8.42%, risk 11.98%, Sharpe 0.703 (1-year window ending 2026-11-18).
- The app's "optimal" mix equals equal weight (33.3% each; return 6.97%, risk 10.93%, Sharpe 0.638), which is *lower* than the current Sharpe. With three names the 1/n cap pins every weight at 1/3, so the optimiser has no freedom.
- PRISM 45.9/100 (F 0, I 56.2, N 87.3, E 40). The best score reachable with these three tickers is 62.7. Yahoo returns no sector for ETFs, so all three count as "Other", which zeroes F and produces the "100% concentrated in Other" callout.
- Over 5 years the 60/20/20 mix returned 7.3% a year (max drawdown −23.6%) against SPY's 10.44% (−24.5%), according to PRISM's backtest block.

## What is in data.json
`sample` (holdings used), `valuation` (summary, per-holding detail, sector allocation), `optimization` (current, optimal and equal-weight stats and weights, suggested trades with reasons, impact, 1-year growth of $1 vs SPY, risk-return scatter), `prism` (score, sub-scores, benchmarks, correlation matrix, callout, 5-year monthly backtest), `prismMax`, and `frontier`. The frontier is **not an app output**: it was traced for this demo with the project's own `optimizer.stats()` on the same window, long-only, with no per-name cap. Its max-Sharpe point is 100% VTI (Sharpe 0.756).

## How the sample was produced
The real `POST /api/analyze` was called through Flask's test client on a scratch copy of `portfolio-intelligence/`, with a small yfinance pull (VTI, VXUS, BND, SPY; 5 years daily) on 2026-11-19:
```
cp -R portfolio-intelligence/{app.py,core,templates,static} /tmp/pi
PYTHONDONTWRITEBYTECODE=1 python3 <demo>/scripts/run_po.py /tmp/pi /tmp/po_raw.json   # then trimmed into data.json
```
No personal holdings, statements or account files were used. See NOTES.md for why this sample is thin.
