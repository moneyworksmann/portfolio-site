import sqlite3, json, sys, re
DB, SQLDIR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
con = sqlite3.connect(DB); con.row_factory = sqlite3.Row
one = lambda q, *a: con.execute(q, a).fetchone()[0]
rows = lambda q, *a: [dict(r) for r in con.execute(q, a)]

# --- choose 8 illustrative loans deterministically -----------------------------
picks = []
def add(q, why):
    for r in con.execute(q):
        if r[0] not in [p[0] for p in picks]:
            picks.append((r[0], why)); return
base = "SELECT l.loan_id FROM stg_loans l JOIN stg_borrowers b ON b.borrower_id=l.borrower_id WHERE "
add(base + "l.loan_id IN (SELECT loan_id FROM stg_loans GROUP BY loan_id HAVING COUNT(*)>1) AND l.int_rate LIKE ' %' ORDER BY l.loan_id", "duplicate row (same loan_id appears twice) + space-padded ' 7.9% ' rate + blank home_ownership -> OTHER")
add(base + "TRIM(b.annual_inc)='' AND l.loan_status='Fully Paid' ORDER BY l.loan_id", "blank income -> median imputed in SQL")
add(base + "CAST(b.annual_inc AS REAL) > 2000000 ORDER BY l.loan_id", "income outlier -> capped at the 99th percentile")
add(base + "TRIM(COALESCE(l.grade,''))='' ORDER BY l.loan_id", "missing grade -> NULL (kept, excluded from grade view)")
add(base + "l.loan_status='Current' AND l.issue_d LIKE '% %' ORDER BY l.loan_id", "still-open loan -> no outcome, excluded from analysis; 'Mon YYYY' date")
add(base + "b.home_ownership IN ('rent','Rent') AND l.term=' 60 months' AND l.int_rate LIKE '% \\%' ESCAPE '\\' ORDER BY l.loan_id", "lower-case 'rent' -> RENT, ' 60 months' term, '6.06 %' rate, blank income")
add(base + "b.home_ownership='ANY' AND l.loan_status='Charged Off' AND l.issue_d LIKE '____-__' ORDER BY l.loan_id", "rare 'ANY' ownership -> OTHER; Charged Off -> default=1; 'YYYY-MM' date")
add(base + "b.emp_length='10+ years' AND l.loan_status LIKE 'Late%' AND l.int_rate NOT LIKE '%\\%%' ESCAPE '\\' ORDER BY l.loan_id", "'10+ years' -> 10; Late (31-120 days) -> default=1; bare-number rate")
ids = [p[0] for p in picks]
raw = []; clean = []
for lid, why in picks:
    r = rows("""SELECT l.*, b.emp_title, b.emp_length, b.annual_inc, b.home_ownership, b.addr_state, b.dti,
                (SELECT COUNT(*) FROM stg_loans x WHERE x.loan_id=l.loan_id) AS copies
                FROM stg_loans l JOIN stg_borrowers b ON b.borrower_id=l.borrower_id WHERE l.loan_id=? LIMIT 1""", lid)[0]
    r["issue"] = why; raw.append(r)
    c = rows("""SELECT l.loan_id, l.borrower_id, l.loan_amnt, l.term_months, l.int_rate, l.grade, l.sub_grade, l.purpose, l.issue_year,
                l.loan_status, l.is_default, b.emp_length_yrs, b.annual_inc, b.home_ownership, b.addr_state, b.dti,
                (SELECT income_band FROM analysis_loans a WHERE a.loan_id=l.loan_id) AS income_band,
                (SELECT COUNT(*) FROM analysis_loans a WHERE a.loan_id=l.loan_id) AS in_analysis
                FROM clean_loans l JOIN clean_borrowers b ON b.borrower_id=l.borrower_id WHERE l.loan_id=?""", int(lid))[0]
    c["in_analysis"] = bool(c["in_analysis"]); clean.append(c)

# --- step counts -------------------------------------------------------------------
med = one("""WITH i AS (SELECT CAST(annual_inc AS REAL) inc FROM stg_borrowers WHERE annual_inc IS NOT NULL AND TRIM(annual_inc)<>''),
 r AS (SELECT inc, ROW_NUMBER() OVER (ORDER BY inc) rn, COUNT(*) OVER () n FROM i) SELECT AVG(inc) FROM r WHERE rn IN ((n+1)/2,(n+2)/2)""")
cap = one("""WITH i AS (SELECT CAST(annual_inc AS REAL) inc FROM stg_borrowers WHERE annual_inc IS NOT NULL AND TRIM(annual_inc)<>''),
 r AS (SELECT inc, ROW_NUMBER() OVER (ORDER BY inc) rn, COUNT(*) OVER () n FROM i) SELECT inc FROM r WHERE rn=CAST(0.99*n AS INTEGER) LIMIT 1""")
stg_l = one("SELECT COUNT(*) FROM stg_loans"); stg_b = one("SELECT COUNT(*) FROM stg_borrowers")
cl = one("SELECT COUNT(*) FROM clean_loans"); cb = one("SELECT COUNT(*) FROM clean_borrowers")
an = one("SELECT COUNT(*) FROM analysis_loans"); opn = one("SELECT COUNT(*) FROM clean_loans WHERE is_default IS NULL")
n_imp = one("SELECT COUNT(*) FROM stg_borrowers WHERE annual_inc IS NULL OR TRIM(annual_inc)=''")
n_cap = one("SELECT COUNT(*) FROM stg_borrowers WHERE TRIM(annual_inc)<>'' AND CAST(annual_inc AS REAL) > ?", cap)
n_pct = one("SELECT COUNT(*) FROM stg_loans WHERE INSTR(int_rate, '%') > 0")
n_bad = one("SELECT COUNT(*) FROM clean_loans WHERE int_rate IS NULL OR term_months IS NULL OR issue_year IS NULL")
steps = [
 {"step": "Load raw CSVs into all-TEXT staging tables", "table": "stg_loans / stg_borrowers", "rowsBefore": None, "rowsAfter": stg_l, "detail": f"{stg_l:,} loan rows, {stg_b:,} borrower rows"},
 {"step": "Deduplicate loans with ROW_NUMBER() OVER (PARTITION BY loan_id)", "table": "clean_loans", "rowsBefore": stg_l, "rowsAfter": cl, "detail": f"{stg_l-cl:,} duplicate loan rows removed"},
 {"step": "Deduplicate borrowers with ROW_NUMBER() OVER (PARTITION BY borrower_id)", "table": "clean_borrowers", "rowsBefore": stg_b, "rowsAfter": cb, "detail": f"{stg_b-cb:,} duplicate borrower rows removed"},
 {"step": "Impute blank incomes with the SQL-computed median", "table": "clean_borrowers", "rowsBefore": cb, "rowsAfter": cb, "detail": f"{n_imp:,} incomes imputed with median ${med:,.0f}"},
 {"step": "Cap incomes at the 99th percentile", "table": "clean_borrowers", "rowsBefore": cb, "rowsAfter": cb, "detail": f"{n_cap:,} incomes capped at ${cap:,.0f}"},
 {"step": "Normalise home_ownership casing, bucket rare values to OTHER", "table": "clean_borrowers", "rowsBefore": cb, "rowsAfter": cb, "detail": f"{one('SELECT COUNT(DISTINCT home_ownership) FROM stg_borrowers')} raw spellings -> {one('SELECT COUNT(DISTINCT home_ownership) FROM clean_borrowers')} categories"},
 {"step": "Cast messy strings: rate '13.5 %' -> 13.5, term ' 36 months' -> 36, 3 date formats -> year", "table": "clean_loans", "rowsBefore": cl, "rowsAfter": cl, "detail": f"{n_pct:,} raw rate strings carried a % sign; {n_bad} rows failed to parse"},
 {"step": "Engineer target is_default from free-text loan_status", "table": "clean_loans", "rowsBefore": cl, "rowsAfter": cl, "detail": f"{one('SELECT SUM(is_default=1) FROM clean_loans'):,} defaults, {one('SELECT SUM(is_default=0) FROM clean_loans'):,} fully paid, {opn:,} still open (NULL)"},
 {"step": "Join loans to borrowers, drop open loans, add income band", "table": "analysis_loans", "rowsBefore": cl, "rowsAfter": an, "detail": f"{opn:,} open loans excluded; overall default rate {one('SELECT ROUND(100.0*AVG(is_default),2) FROM analysis_loans')}%"},
]

# --- SQL steps (verbatim excerpts from sql/) ------------------------------------
clean_sql = open(f"{SQLDIR}/02_clean.sql").read(); ana_sql = open(f"{SQLDIR}/03_analysis.sql").read()
def between(text, start, end):
    i = text.index(start); j = text.index(end, i + len(start)) if end else len(text)
    return text[i:j].strip()
sql_steps = [
 {"file": "02_clean.sql", "caption": "Median income computed in SQL (SQLite has no MEDIAN): take the middle row(s) of the ordered non-nulls.", "sql": between(clean_sql, "WITH incomes AS", "-- 99th-percentile")},
 {"file": "02_clean.sql", "caption": "99th-percentile income, used as the outlier cap.", "sql": between(clean_sql, "p99_inc AS", "-- Collapse duplicate")},
 {"file": "02_clean.sql", "caption": "Deduplicate borrowers: keep one row per borrower_id with ROW_NUMBER().", "sql": between(clean_sql, "dedup AS (\n    SELECT *,\n           ROW_NUMBER() OVER (PARTITION BY borrower_id", "INSERT INTO clean_borrowers")},
 {"file": "02_clean.sql", "caption": "Income: cast, impute the median when blank, cap at p99.", "sql": between(clean_sql, "-- income: cast", "-- home_ownership")},
 {"file": "02_clean.sql", "caption": "home_ownership: upper-case and bucket rare/blank values into OTHER.", "sql": between(clean_sql, "CASE UPPER(TRIM(COALESCE(d.home_ownership", "    UPPER(TRIM(d.addr_state))")},
 {"file": "02_clean.sql", "caption": "Deduplicate loans: exact duplicate rows share a loan_id; keep the first.", "sql": between(clean_sql, "WITH dedup AS (\n    -- exact duplicate", "INSERT INTO clean_loans")},
 {"file": "02_clean.sql", "caption": "Term ' 36 months' / '60' -> integer months; rate ' 13.5% ' -> 13.5.", "sql": between(clean_sql, "-- term \" 36 months\"", "    NULLIF(TRIM(COALESCE(d.grade")},
 {"file": "02_clean.sql", "caption": "Issue date in three formats ('Dec-2018', '2018-12', 'Dec 2018') -> year.", "sql": between(clean_sql, "-- issue_d in mixed formats", "    TRIM(d.loan_status),")},
 {"file": "02_clean.sql", "caption": "Target: Fully Paid -> 0, any delinquency -> 1, still open -> NULL.", "sql": between(clean_sql, "-- TARGET:", "FROM dedup d\nWHERE d.rn = 1;\n")},
 {"file": "03_analysis.sql", "caption": "Join loans to borrowers, keep only known outcomes, bucket income.", "sql": between(ana_sql, "CREATE TABLE analysis_loans AS", "-- ---- summary views")},
 {"file": "03_analysis.sql", "caption": "Default rate by grade.", "sql": between(ana_sql, "CREATE VIEW v_default_by_grade AS", "DROP VIEW IF EXISTS v_default_by_purpose")},
]
def norm(r):
    return {k: (round(v, 4) if isinstance(v, float) else v) for k, v in r.items()}
data = {"asOf": "2026-11-20",
 "source": "credit-risk-sql pipeline (./run.sh, default 40,000 loans, seed 42) run on a scratch copy; the raw data is SYNTHETIC, generated by scripts/generate_data.py to mimic Lending Club's structure and messiness",
 "rowCounts": {"rawLoanRows": stg_l, "rawBorrowerRows": stg_b, "cleanLoans": cl, "cleanBorrowers": cb, "openLoansExcluded": opn, "analysisLoans": an,
               "overallDefaultRatePct": one("SELECT ROUND(100.0*AVG(is_default),2) FROM analysis_loans")},
 "steps": steps,
 "sample": {"note": "The same 8 loans before (staging, all text) and after (typed) cleaning; raw columns show the borrower's raw fields joined in", "raw": raw, "clean": [norm(c) for c in clean]},
 "sqlSteps": sql_steps,
 "defaultRate": {
   "byGrade": [norm(r) for r in rows("SELECT * FROM v_default_by_grade")],
   "byTerm": [norm(r) for r in rows("SELECT * FROM v_default_by_term")],
   "byIncomeBand": [norm(r) for r in rows("SELECT * FROM v_default_by_income_band")],
   "byPurpose": [norm(r) for r in rows("SELECT * FROM v_default_by_purpose")]},
 "caveats": [
   "Synthetic data: the default-rate patterns are planted by the generator (GRADE_DEFAULT_P x PURPOSE_RISK, x1.15 for 60-month), so the analysis recovers them rather than discovering them.",
   "Generator fixes (2026-11-20): each term now gets only its own spellings, so 36- and 60-month loans are labelled correctly; data-entry income outliers are now 0.3% of borrowers, so the 99th-percentile cap lands in the real income distribution."]}
json.dump(data, open(OUT, "w"), separators=(",", ":"))
print(json.dumps(steps, indent=1)); print([ (r['loan_id'], r['issue']) for r in raw])
