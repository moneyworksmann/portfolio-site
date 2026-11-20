# Credit-Risk SQL Pipeline — demo facts

**What it does.** Takes messy consumer-loan records (shaped like Lending Club data) through an all-SQL cleaning pipeline in SQLite, then into default-risk summaries. The SQL handles deduplication, type casting, median imputation, outlier capping, category cleanup and building the default flag. Python only loads the CSVs and runs the `.sql` files in order.

**Stack.** SQLite (window functions, CTEs, views), Python 3 standard library for generation and loading, pandas/matplotlib for the report and charts, Tableau packaged workbook (`tableau/Credit_Risk_Dashboard.twbx`).

## Facts from this run (40,000 loans, seed 42)
- 41,200 raw loan rows → 40,000 after `ROW_NUMBER()` deduplication (1,200 duplicates removed) → 32,684 loans with a known outcome after 7,316 still-open loans are dropped.
- The median income ($60,428) is computed in SQL and fills 1,576 blank incomes. Ten raw spellings of home_ownership collapse to 4 categories, and all 40,000 rates, terms and dates parse (0 failures).
- Overall default rate is 19.30%. It rises steadily with grade: A 6.00% → B 11.73% → C 18.73% → D 26.87% → E 38.40% → F 48.68% → G 59.34%, so grade G is 9.9× grade A.
- `small_business` is the riskiest purpose (28.94%). 60-month loans default at 20.80% against 17.78% for 36-month loans (16,425 vs 16,267 loans). Income band barely matters (18.7%–19.6%).

## Caveats (stated in data.json too)
- **The data is synthetic.** `scripts/generate_data.py` creates it and plants the grade, purpose and term effects, so the analysis recovers patterns the generator put there.
- Generator fixed on 2026-11-20: each term is written only with its own spellings, so 36- and 60-month loans are labelled correctly.
- Data-entry income outliers are now 0.3% of borrowers, so the 99th-percentile cap lands in the real distribution; the 150k+ band averages $180k.

## What is in data.json
`rowCounts`, `steps` (row counts before and after each cleaning step, with details), `sample` (the same 8 loans raw and cleaned, each with a note on what was messy), `sqlSteps` (11 verbatim excerpts from `sql/02_clean.sql` and `sql/03_analysis.sql`, each with a caption), `defaultRate` by grade, term, income band and purpose, and `caveats`.

## How the sample was produced
Run per the README on a scratch copy of the project, so no files were created in the repo:
```
cp -R run.sh scripts sql requirements.txt /tmp/crs && cd /tmp/crs && ./run.sh      # 40,000 loans, seed 42
python3 -I <demo>/scripts/build_crs_json.py credit_risk.db sql data.json
```
Charts were skipped because matplotlib isn't installed in the system Python, which doesn't affect the SQL or the numbers.
