# QuantFlow — demo facts

**What it does.** A multi-strategy, cross-sectional signal engine for US large caps (point-in-time S&P 500 ∪ Nasdaq-100): it runs independent strategy sleeves, blends them through a risk layer, and emits sized, timestamped signals. It is built to make it hard to fool yourself: no look-ahead, a two-session execution lag, costs on every trade, survivorship-aware membership, and one code path shared by backtest and live.

**Stack.** Python 3.12, pandas/NumPy, DuckDB (single-file store over Yahoo daily bars), exchange_calendars, pytest; Discord webhooks as the signal sink, with paper and Alpaca broker adapters.

## Facts from this run (2015-01-02 → 2026-11-19, net of 10 bps/side, lag 2)
- Blended book: CAGR 7.02%, volatility 15.20%, Sharpe 0.52, max drawdown −31.4%, daily hit rate 54.9%, ~670 orders a year.
- SPY over the same window: CAGR 13.09%, Sharpe 0.79, max drawdown −33.7%. The book's beta is 0.69, and its beta-hedged ("alpha") CAGR is −1.96% (alpha Sharpe −0.17). In the README's words, the sleeves are "expensive index replication".
- Momentum sleeve: CAGR 12.94%, Sharpe 0.65, beta 1.06. Mean-reversion sleeve: CAGR 6.17%, Sharpe 0.42, beta 0.73. Their daily returns correlate at 0.66.
- Price coverage of the point-in-time universe rises from 77% in 2015 to 99.5% in 2026 (`coverageByYear`); the missing names are mostly delisted losers, so early-period returns lean optimistic.
- README results (lag 1, through 2026-09, also in `readmePublished`): Phase 2 CAGR 9.21%, Sharpe 0.67, max drawdown −25.2%. The config has since moved to `execution_lag: 2`, which the hub copy of the README says costs about 1.8 points of CAGR. That explains the lower fresh numbers.

## What is in data.json
`summary` (the project's `metrics.summarize` output for the blend), `sleeves` (name, description, parameters and stats for momentum and mean_reversion), `correlation`, `signals` (target book on 2026-11-19: 22 names with ticker, blended weight, sleeve, score from the sleeve's own `explain()`: 12-1 momentum return or 20-day z-score, plus price), `equityCurve` (weekly, base 1.0: blend, SPY, each sleeve), `drawdownWeeklyMin`, `coverageByYear`, `config`.

The final session (2026-11-19) shows a 0 return because no bar existed for it yet when the run happened. The summary stats include it exactly as the engine computed them.

## How the sample was produced
The project's own backtest, the same call `python -m quantflow.cli backtest` makes, run in-process on its cached DuckDB store. No network and no `--plot`/`--csv`, so nothing was written to the project (bytecode writes disabled). It took about 7 seconds.
```
cd quantflow && PYTHONPATH=. PYTHONDONTWRITEBYTECODE=1 .venv/bin/python <demo>/scripts/run_quantflow.py /tmp/qf.pkl
.venv/bin/python -I <demo>/scripts/build_qf_json.py /tmp/qf.pkl data.json
```
The live paper book, the discretionary ("manual") book and the trade ledger were deliberately not exported.
