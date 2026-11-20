# Notes: what's missing for a better optimizer demo

- **The project ships no demo holdings.** There's no sample CSV, fixture or seed list. The only portfolios defined in its code are the PRISM benchmarks in `core/prism.py`: SPY alone, and the 3-Fund Portfolio (VTI 60 / VXUS 20 / BND 20). The README's API example has one holding (AAPL), and the optimiser needs at least 2.
- Older history in the repo has a hard-coded `HOLDINGS` dict (in the pre-merge `portfolio_optimizer.py`) and an `Investment_Portfolio_Tracker.xlsx`. Both look like real personal positions, so they were **not** used.
- With the 3-fund sample, the app's cap rule max(25%, 1/n) forces every weight to exactly 1/3. The "optimal" allocation is therefore just equal weight and scores *below* the current mix (Sharpe 0.638 vs 0.703). That is correct output given the inputs, but it shows little on a public page.
- The app has no efficient-frontier view. The `frontier` block in data.json was computed for this demo with the project's `optimizer.stats()`, without the per-name cap, and is labelled that way.
- PRISM's sector score is 0 for any all-ETF portfolio because Yahoo returns no GICS sector for funds.

**To fix:** add a non-personal demo portfolio of at least 6 names to the project (e.g. `portfolio-intelligence/sample_holdings.csv`) and rerun `scripts/run_po.py`. Choosing those names is up to you, so this export didn't invent one.
