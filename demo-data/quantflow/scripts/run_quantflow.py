"""Runs quantflow's own backtest pipeline (same call as `cli backtest`) in-process,
read-only against store/quantflow.duckdb, and dumps results to a pickle in scratchpad.
Nothing is written inside the project (no --plot/--csv equivalents)."""
import sys, time, pickle
t0 = time.time()
from quantflow.config import load_config
from quantflow.market import load_panel, coverage_report
from quantflow.strategies import build_strategies
from quantflow.portfolio import build_constructor
from quantflow.backtest import run_backtest
cfg = load_config()
panel = load_panel(cfg, market="US")
print("panel loaded", round(time.time()-t0,1), flush=True)
res = run_backtest(panel, build_strategies(cfg), constructor=build_constructor(cfg, panel),
    start=cfg.get("backtest.start"), end=cfg.get("backtest.end"),
    cost_bps=cfg.get("backtest.cost_bps", 10.0), lag=cfg.get("backtest.execution_lag", 1),
    benchmark=cfg.market("US").benchmark)
print(res.report(), flush=True)
cov = coverage_report(panel).resample("YE").mean()
weights = res.construction.weights if res.construction is not None else res.weights
out = {"returns": res.returns, "benchmark": res.benchmark, "summary": res.summary,
  "sleeves": {k: {"summary": v.summary, "returns": v.returns, "last_w": v.weights.iloc[-1]} for k, v in res.sleeves.items()},
  "weights_last": weights.iloc[-1], "weights_day": weights.index[-1], "coverage": cov,
  "construction_summary": res.construction.summary() if res.construction is not None else None,
  "corr": res.correlation_matrix(),
  "strategies": [(s.name, type(s).__name__, (s.__doc__ or "").strip(), getattr(s, "sleeve_weight", None)) for s in build_strategies(cfg)],
  "cfg_backtest": cfg.get("backtest"), "cfg_strats": cfg.get("strategies"), "cfg_portfolio": cfg.get("portfolio")}
strats = build_strategies(cfg)
day = weights.index[-1]
view = panel.view(day)
reasons = {}
for st in strats:
    W = res.sleeves[st.name].weights
    if day in W.index:
        row = W.loc[day]; picks = row.index[row.abs() > 1e-12]
        if len(picks):
            reasons[st.name] = {"weights": row[picks].to_dict(), "explain": st.explain(view, picks)}
out["sleeve_picks"] = reasons
out["price"] = view.price().reindex(weights.iloc[-1][weights.iloc[-1].abs()>1e-9].index).to_dict()
close = panel.base("close"); out["last_bar"] = str(close.index[close.notna().sum(axis=1) > 0][-1].date())
pickle.dump(out, open(sys.argv[1], "wb"))
print("done", round(time.time()-t0,1))
