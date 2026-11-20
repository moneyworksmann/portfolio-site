"""Run portfolio-intelligence's real /api/analyze on the project's own shipped
sample: the 3-Fund benchmark portfolio defined in core/prism.py (VTI 60 / VXUS 20 / BND 20)."""
import sys, json, os
APP = sys.argv[1]; OUT = sys.argv[2]
sys.path.insert(0, APP); os.chdir(APP)
import numpy as np
from scipy.optimize import minimize
from core.prism import BENCHMARKS
from core.market_data import MarketData
from core import optimizer
import app as webapp

sample = BENCHMARKS["three_fund"]["weights"]
NOTIONAL = 100_000
md0 = MarketData(list(sample), period="5y")
holdings = [{"ticker": t, "shares": round(w * NOTIONAL / md0.latest[t], 4), "avg_cost": round(md0.latest[t], 2)} for t, w in sample.items()]

client = webapp.app.test_client()
resp = client.post("/api/analyze", json={"holdings": holdings})
res = resp.get_json()
assert resp.status_code == 200, res

# Efficient frontier over the same 1y window, using the project's own stats() and
# its long-only fully-invested constraints. The 25% cap is relaxed to 100% here:
# with three funds the app raises the cap to 1/3, which pins every weight at 1/3.
md = md0
tick = [t for t in md.valid if t in sample]
mu = md.mean_returns(252).reindex(tick); cov = md.covariance(252).reindex(index=tick, columns=tick)
ann_mu = mu.values * 252
def min_var(target):
    n = len(tick)
    cons = [{"type": "eq", "fun": lambda w: w.sum() - 1}, {"type": "eq", "fun": lambda w: w @ ann_mu - target}]
    r = minimize(lambda w: w @ cov.values @ w, np.ones(n) / n, method="SLSQP", bounds=[(0, 1)] * n, constraints=cons)
    return r.x if r.success else None
lo, hi = ann_mu.min(), ann_mu.max()
frontier = []
for tgt in np.linspace(lo, hi, 25):
    w = min_var(tgt)
    if w is None: continue
    ret, risk, sh = optimizer.stats(w, mu, cov)
    frontier.append({"ret": round(ret * 100, 3), "risk": round(risk * 100, 3), "sharpe": round(sh, 3), "weights": {t: round(float(x) * 100, 2) for t, x in zip(tick, w)}})
# keep only the efficient (upper) branch
mv = min(frontier, key=lambda p: p["risk"])
eff = [p for p in frontier if p["ret"] >= mv["ret"] - 1e-9]
uncapped_opt = optimizer.optimize.__wrapped__ if hasattr(optimizer.optimize, "__wrapped__") else None
n = len(tick)
r = minimize(lambda w: -((w @ ann_mu) / np.sqrt(w @ cov.values @ w * 252)), np.ones(n) / n, method="SLSQP", bounds=[(0, 1)] * n,
             constraints={"type": "eq", "fun": lambda w: w.sum() - 1})
ms_ret, ms_risk, ms_sh = optimizer.stats(r.x, mu, cov)
assets = [{"ticker": t, "ret": round(float(ann_mu[i]) * 100, 3), "risk": round(float(np.sqrt(cov.values[i, i] * 252)) * 100, 3)} for i, t in enumerate(tick)]
json.dump({"sample": {"label": BENCHMARKS["three_fund"]["label"], "targetWeights": sample, "notional": NOTIONAL, "holdings": holdings},
           "api": res, "frontier": {"points": eff, "all": frontier, "assets": assets,
           "maxSharpeUncapped": {"ret": round(ms_ret * 100, 3), "risk": round(ms_risk * 100, 3), "sharpe": round(ms_sh, 3), "weights": {t: round(float(x) * 100, 2) for t, x in zip(tick, r.x)}}},
           "window": {"start": str(md.closes_window(252).index[0].date()), "end": str(md.closes.index[-1].date())}},
          open(OUT, "w"), default=str)
print("ok", resp.status_code, res["optimization"].get("available"), res["optimization"].get("max_position_pct"))
print(json.dumps(res["optimization"]["strategies"], indent=0)[:800])
print("prism", {k: res["prism"].get(k) for k in list(res["prism"])[:8]})
