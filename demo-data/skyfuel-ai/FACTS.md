# SkyFuel AI — demo facts

**What it does.** SkyFuel trains a fast ML surrogate on the output of the OpenAP aircraft physics model, so it can answer "what if we cruise at FL340 instead of FL370?" or "what if payload rises 2 t?" for an A320 in milliseconds instead of re-flying the physics. Each prediction comes with SHAP contributions that sum exactly to the predicted fuel, and CO₂ is fuel × 3.16.

**Stack.** Python, pandas, OpenAP (physics labels), XGBoost + scikit-learn linear trend (`TrendPlusResidual`), SHAP, Parquet + DuckDB, Streamlit/Altair dashboard, pytest.

## Facts (from code and from this run)
- v1 slice: 930 synthetic A320 flights, 3 city pairs out of Heathrow (EGLL–LFPG, EGLL–LEMD, EGLL–LIRF, both directions), March 2025; 618,581 trajectory points (pipeline log).
- Five dispatch-time features only: great-circle distance, planned flight level, forecast headwind, planned payload, taxi-out estimate. A leakage firewall (`skyfuel/features.py`) raises `LeakageError` if a feature known later than dispatch is requested.
- Primary model in this run: time-split MAE 168 kg, MAPE 4.7%, R² 0.982; with a whole route held out, MAE 211 kg / MAPE 6.1%. Plain XGBoost scored 4.3% on the time split but 64.3% on the held-out route, which is why the hybrid exists.
- Monotone physics directions are enforced: in the what-if audit, "payload +2 t" got the right sign on 40/40 re-flown flights (100%); FL changes agreed 69–89% of the time.
- Full pipeline (ingest → label → train → audit) took ~34 s wall-clock on this laptop.

## How the sample was produced
`python -m skyfuel all` was run in a scratch copy of the repo (source untouched) on 2026-11-19. `export_demo.py` then loaded the saved model and used the same `Explainer.explain_flight` / `model.predict` calls the dashboard uses:
- `metrics` / `pipelineLog`: exactly as written/printed by the run.
- `whatIfGrid`: for each of the 6 directional routes, a representative held-out flight (median payload); FL 240–390 in steps of 10 × payload 8–20 t in steps of 2 t; other inputs held at that flight's values. `extrapolation: true` marks FLs more than 20 levels outside what that route saw in training (dashboard rule).
- `shapFlights`: the median-fuel held-out flight on each route (6 flights), with physics label, prediction, base value, per-feature SHAP kg, and physics fuel by phase.
- `parityTest`: physics label vs prediction for the 240 test-split flights.

## Must be labelled
- **Synthetic data:** flights/trajectories come from the repo's OpenSky-shaped generator and synthetic winds, not real ADS-B. The OpenSky loader exists but is untested.
- **Physics labels, not airline fuel data:** the "truth" is OpenAP's model output.
- Numbers differ slightly from the README table (e.g. XGBoost route-held-out MAPE 64.3% here vs 69.4% in README); the export uses this run's printed values.
