import pickle, json, sys, math
import pandas as pd
d = pickle.load(open(sys.argv[1], "rb")); OUT = sys.argv[2]
def clean(v):
    if isinstance(v, float): return None if math.isnan(v) or math.isinf(v) else round(v, 6)
    return v
def summ(s):
    keys = ["start","end","years","total_return","cagr","vol","sharpe","sortino","max_drawdown","calmar","hit_rate","time_under_water_days",
            "ann_turnover","avg_positions","avg_gross_exposure","orders_per_year","bench_cagr","bench_sharpe","bench_max_drawdown","excess_cagr","beta","corr_to_bench","alpha_cagr","alpha_sharpe"]
    return {k: clean(float(s[k]) if isinstance(s[k], (int, float)) and not isinstance(s[k], bool) else s[k]) for k in keys if k in s}
r = d["returns"]; b = d["benchmark"].reindex(r.index).fillna(0.0)
eq = pd.DataFrame({"strategy": (1+r).cumprod(), "benchmark": (1+b).cumprod(),
    **{f"sleeve_{k}": (1+v["returns"].reindex(r.index).fillna(0.0)).cumprod() for k, v in d["sleeves"].items()}})
wk = eq.resample("W-FRI").last().dropna()
if wk.index[-1] != eq.index[-1]: wk.loc[eq.index[-1]] = eq.iloc[-1]
wk = wk[~wk.index.duplicated(keep="last")]
dd = (eq["strategy"]/eq["strategy"].cummax()-1).resample("W-FRI").min()
curve = [{"date": str(i.date()), "strategy": round(row["strategy"], 5), "benchmark": round(row["benchmark"], 5),
          "momentum": round(row["sleeve_momentum"], 5), "meanReversion": round(row["sleeve_mean_reversion"], 5)} for i, row in wk.iterrows()]
cs = d["cfg_strats"]
desc = {"momentum": "12-1 cross-sectional momentum: rank the point-in-time S&P 500 ∪ Nasdaq-100 universe by 12-month return skipping the last month, drop the most volatile decile and illiquid names (<$20M ADV), hold the top 20 equal-weighted, rebalance monthly.",
        "mean_reversion": "Short-horizon reversion: buy liquid names (>$50M ADV) above their 200-day SMA after a 2.5σ dip in the 20-day z-score; exit at −0.5σ or after 20 sessions; 10 fixed slots, oldest trades keep their slot; entries blacked out around earnings."}
sleeves = []
for name, typ, doc, sw in d["strategies"]:
    sleeves.append({"name": name, "class": typ, "sleeveWeight": sw, "rebalance": cs[name].get("rebalance"), "description": desc[name],
                    "params": {k: v for k, v in cs[name].items() if k not in ("enabled",)}, "stats": summ(d["sleeves"][name]["summary"])})
w = d["weights_last"]; w = w[w.abs() > 1e-9].sort_values(ascending=False)
sig = []
for t, wt in w.items():
    row = {"ticker": t, "weight": round(float(wt), 4), "price": clean(float(d["price"].get(t, float("nan"))))}
    srcs = [s for s, p in d["sleeve_picks"].items() if t in p["weights"]]
    row["sleeve"] = "+".join(srcs)
    for s in srcs:
        ex = d["sleeve_picks"][s]["explain"][t]
        if s == "momentum":
            row["score"] = clean(ex["mom_12_1"]); row["scoreLabel"] = "12-1 momentum return"
            row["vol60d"] = clean(ex["vol_60d"]); row["advUsdM"] = clean(ex["adv_usd_m"])
        else:
            k = [k for k in ex if k.startswith("zscore")][0] if any(k.startswith("zscore") for k in ex) else list(ex)[0]
            row["score"] = clean(ex[k]); row["scoreLabel"] = "20-day z-score at entry check"
            row["ret5d"] = clean(ex.get("ret_5d")); row["daysHeld"] = clean(ex.get("days_held"))
        row["sleeveWeight"] = round(float(d["sleeve_picks"][s]["weights"][t]), 4)
    sig.append(row)
corr = d["corr"].round(3)
data = {"asOf": str(r.index[-1].date()), "lastBar": d["last_bar"],
  "source": "quantflow `backtest` pipeline (run_backtest + Phase 2 portfolio constructor, config/settings.yaml as committed) run in-process on the project's cached DuckDB store (Yahoo daily bars, point-in-time S&P 500 ∪ NDX membership), 2026-11-19; read-only, nothing written to the project",
  "config": {"backtest": d["cfg_backtest"], "portfolio": {k: d["cfg_portfolio"][k] for k in ["static_gross_scale","max_name_weight","max_sector_weight","dd_halt","dd_resume","regime_enabled","hedge_enabled","vol_target_enabled"]}},
  "summary": summ(d["summary"]),
  "sleeves": sleeves,
  "correlation": {c: {k: float(v) for k, v in corr[c].items()} for c in corr.columns},
  "signals": {"asOf": str(d["weights_day"].date()), "grossExposure": round(float(w.sum()), 4), "positions": sig,
              "note": "Target book after blending (sleeve weight × 0.84 static gross scale) and caps (8% name, 30% sector). Score = the sleeve's own ranking input from Strategy.explain()."},
  "equityCurve": {"frequency": "weekly (Friday close; last point is the final session)", "base": 1.0, "points": curve},
  "drawdownWeeklyMin": [{"date": str(i.date()), "dd": round(float(v), 4)} for i, v in dd.items()],
  "coverageByYear": [{"year": i.year, "members": round(float(rw["members"]), 1), "withPrices": round(float(rw["with_prices"]), 1), "coverage": round(float(rw["coverage"]), 4)} for i, rw in d["coverage"].iterrows() if i.year >= 2015],
  "readmePublished": {"note": "Headline table from README.md (2015-01 → 2026-09, net 10bps/side, 1-day lag). Current config uses execution_lag 2, which is why the fresh run above is lower.",
     "rows": [{"label": "Phase 1 (no risk layer)", "cagr": 0.1148, "sharpe": 0.66, "maxDrawdown": -0.387, "vol": 0.195, "ordersPerYear": 719},
              {"label": "Phase 2 (shipped)", "cagr": 0.0921, "sharpe": 0.67, "maxDrawdown": -0.252, "vol": 0.149, "ordersPerYear": 666},
              {"label": "momentum sleeve", "cagr": 0.1437, "sharpe": 0.70, "maxDrawdown": -0.378, "vol": 0.229, "ordersPerYear": 198},
              {"label": "mean_reversion sleeve", "cagr": 0.0751, "sharpe": 0.49, "maxDrawdown": -0.448, "vol": 0.184, "ordersPerYear": 468},
              {"label": "SPY buy & hold", "cagr": 0.1381, "sharpe": 0.82, "maxDrawdown": -0.337, "vol": None, "ordersPerYear": None}]}}
json.dump(data, open(OUT, "w"), separators=(",", ":"), default=str)
print(json.dumps(data["summary"], indent=0)[:900]); print(len(curve), "weekly points")
