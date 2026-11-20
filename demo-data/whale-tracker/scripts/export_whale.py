"""Read-only export of public 13F data from whale-tracker's data/whale.db.
Mirrors src/lib/analytics.ts getHoldings / investorStats / similarity.
Only touches tables: investors, filings, holdings, securities (all public SEC-derived)."""
import sqlite3, json, sys, math, os
DB = os.environ.get("WHALE_DB", "../whale-tracker/data/whale.db")  # path to the Whale Tracker database
OUT = sys.argv[1]
FUNDS = [("1067983","Berkshire Hathaway","Warren Buffett / Greg Abel"),
         ("1336528","Pershing Square","Bill Ackman"),
         ("1656456","Appaloosa","David Tepper"),
         ("1167483","Tiger Global","Chase Coleman"),
         ("1350694","Bridgewater Associates","Ray Dalio (founder)")]
TOP = 25
con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
con.row_factory = sqlite3.Row

def raw(cik, rd):
    return [dict(r) for r in con.execute("""SELECT h.cusip, h.name_of_issuer, h.title_of_class, h.put_call, h.value, h.shares, h.sh_prn_type,
      s.ticker, s.sector FROM holdings h JOIN filings f ON f.accession=h.accession LEFT JOIN securities s ON s.cusip=h.cusip
      WHERE h.cik=? AND f.is_active=1 AND f.report_date=? ORDER BY h.value DESC""", (cik, rd))]

def dates(cik):
    return [dict(r) for r in con.execute("SELECT report_date, filing_date FROM filings WHERE cik=? AND is_active=1 ORDER BY report_date DESC", (cik,))]

key = lambda h: f"{h['cusip']}|{h['put_call']}"
r4 = lambda x, n=6: None if x is None else round(x, n)

def quarter(cik, rd, prev_rd):
    cur = raw(cik, rd); total = sum(r["value"] for r in cur) or 1
    prev = raw(cik, prev_rd) if prev_rd else []; ptotal = sum(r["value"] for r in prev) or 1
    pm = {key(p): p for p in prev}
    rows = []
    for h in cur:
        p = pm.get(key(h)); w = h["value"]/total; pw = p["value"]/ptotal if p else None
        ch = "NEW"
        if p: ch = "ADDED" if h["shares"] > p["shares"]*1.001 else "REDUCED" if h["shares"] < p["shares"]*0.999 else "HELD"
        rows.append(dict(h, weight=w, change=ch, prev_shares=p["shares"] if p else None, prev_weight=pw,
            shares_change_pct=(h["shares"]-p["shares"])/p["shares"] if p and p["shares"]>0 else None))
    ck = {key(h) for h in cur}
    exited = [dict(p, weight=0, prev_weight=p["value"]/ptotal) for p in prev if key(p) not in ck]
    counts = {k:0 for k in ["NEW","ADDED","REDUCED","HELD","EXITED"]}
    for r in rows: counts[r["change"]] += 1
    counts["EXITED"] = len(exited) if prev_rd else 0
    sectors = {}
    for r in rows: sectors[r["sector"] or "Unknown"] = sectors.get(r["sector"] or "Unknown", 0) + r["weight"]
    ws = sorted((r["weight"] for r in rows), reverse=True)
    hhi = sum(w*w for w in ws)
    turnover = (sum(abs(r["weight"]-(r["prev_weight"] or 0)) for r in rows) + sum(e["prev_weight"] for e in exited))/2 if prev_rd else None
    fmt = lambda r: {"ticker": r["ticker"], "name": r["name_of_issuer"], "cusip": r["cusip"],
        "putCall": r["put_call"] or None, "value": round(r["value"]), "weight": r4(r["weight"]),
        "shares": round(r["shares"]), "change": r["change"], "prevShares": None if r["prev_shares"] is None else round(r["prev_shares"]),
        "prevWeight": r4(r["prev_weight"]), "sharesChangePct": r4(r["shares_change_pct"], 4), "sector": r["sector"] or "Unknown"}
    exited.sort(key=lambda e: -e["value"])
    return {"reportDate": rd, "positions": len(rows), "totalValue": round(total),
        "top10Weight": r4(sum(ws[:10])), "effectiveN": round(1/hhi, 2) if hhi else None, "turnover": r4(turnover, 4),
        "changeCounts": counts,
        "sectorMix": [{"sector": k, "weight": r4(v)} for k, v in sorted(sectors.items(), key=lambda kv: -kv[1])],
        "holdings": [fmt(r) for r in rows[:TOP]],
        "exited": [{"ticker": e["ticker"], "name": e["name_of_issuer"], "cusip": e["cusip"], "putCall": e["put_call"] or None,
                    "prevValue": round(e["value"]), "prevWeight": r4(e["prev_weight"]), "prevShares": round(e["shares"]), "change": "EXITED"} for e in exited[:15]]}

funds = []; latest_vec = {}; latest_names = {}
for cik, short, manager in FUNDS:
    inv = con.execute("SELECT name FROM investors WHERE cik=?", (cik,)).fetchone()
    ds = dates(cik)
    if len(ds) < 3: print("skip", cik); continue
    q_latest = quarter(cik, ds[0]["report_date"], ds[1]["report_date"])
    q_prev = quarter(cik, ds[1]["report_date"], ds[2]["report_date"])
    q_latest["filingDate"] = ds[0]["filing_date"]; q_prev["filingDate"] = ds[1]["filing_date"]
    funds.append({"cik": cik, "name": short, "filerName": inv["name"], "manager": manager, "quartersOnFile": len(ds),
                  "quarters": [q_latest, q_prev]})
    longs = [r for r in raw(cik, ds[0]["report_date"]) if not r["put_call"]]
    t = sum(r["value"] for r in longs) or 1
    latest_vec[cik] = {r["cusip"]: r["value"]/t for r in longs}
    latest_names.update({r["cusip"]: (r["ticker"], r["name_of_issuer"]) for r in longs})

overlap = []
ciks = [f["cik"] for f in funds]
for i in range(len(ciks)):
    for j in range(i+1, len(ciks)):
        A, B = latest_vec[ciks[i]], latest_vec[ciks[j]]
        inter = [k for k in A if k in B]
        dot = sum(A[k]*B[k] for k in inter); na = sum(w*w for w in A.values()); nb = sum(w*w for w in B.values())
        union = len(A)+len(B)-len(inter)
        shared = sorted(inter, key=lambda k: -min(A[k], B[k]))
        overlap.append({"a": ciks[i], "b": ciks[j], "sharedCount": len(inter),
            "jaccard": r4(len(inter)/union if union else 0, 4), "cosine": r4(dot/math.sqrt(na*nb) if na and nb else 0, 4),
            "overlapWeight": r4(sum(min(A[k], B[k]) for k in inter), 4),
            "shared": [{"ticker": latest_names[k][0], "name": latest_names[k][1], "weightA": r4(A[k]), "weightB": r4(B[k])} for k in shared[:20]]})

# stocks held by >=2 of the selected funds (latest quarter, long only)
holders = {}
for cik, v in latest_vec.items():
    for k, w in v.items(): holders.setdefault(k, []).append({"cik": cik, "weight": r4(w)})
common = sorted([(k, h) for k, h in holders.items() if len(h) >= 2], key=lambda kh: (-len(kh[1]), -sum(x["weight"] for x in kh[1])))
data = {"asOf": max(f["quarters"][0]["filingDate"] for f in funds),
  "source": "SEC EDGAR Form 13F-HR filings as ingested by Whale Tracker (data/whale.db, read-only snapshot taken 2026-11-19); tickers via OpenFIGI, sectors from SEC SIC codes",
  "notes": ["value is USD as reported on the 13F (latest filings report whole dollars)",
            "weight = position value / total reported 13F value for that quarter (options rows included, as in the app)",
            "change compares share counts with the prior quarter: >+0.1% ADDED, <-0.1% REDUCED, else HELD; NEW/EXITED by CUSIP+put/call",
            "overlap uses long positions only in each fund's latest quarter, matched by CUSIP (same as the app's similarity())",
            "holdings lists are the top 25 by value; exited lists the 15 largest exits by prior value",
            "Each fund's latest quarter differs: Pershing Square's latest ingested 13F is 2026-03-31"],
  "funds": funds, "overlap": overlap,
  "commonHoldings": [{"ticker": latest_names[k][0], "name": latest_names[k][1], "holders": h} for k, h in common[:30]]}
json.dump(data, open(OUT, "w"), separators=(",", ":"))
print("ok", len(funds), "funds")
