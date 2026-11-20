# Whale Tracker — demo facts

**What it does.** Tracks the quarterly 13F-HR filings of large investors from SEC EDGAR, shows every quarter-over-quarter move (NEW / ADDED / REDUCED / HELD / EXITED), and compares what several funds own in common. Every number comes from free sources: SEC EDGAR for filings, shares outstanding and SIC sector codes, OpenFIGI for CUSIP→ticker, Cboe for prices.

**Stack.** Next.js 16 (App Router, React 19), TypeScript, SQLite via a single file (`data/whale.db`), Recharts, Tailwind 4; ingest/enrich scripts run with `tsx`.

## Facts from the code and this snapshot
- The local database holds 153 active 13F filings (report dates 2021-09-30 → 2026-06-30) and 141,170 holding rows across 8 tracked filers; the fund directory lists 9,439 13F filers.
- A position's change type compares share counts with the prior quarter: more than +0.1% is ADDED, less than −0.1% is REDUCED, otherwise HELD; NEW/EXITED are matched by CUSIP + put/call (`src/lib/analytics.ts`, `getHoldings`).
- Berkshire Hathaway's 2026-06-30 13F: 29 positions worth $299.3B; Apple 22.0%, American Express 17.1%, Coca-Cola 10.9%; top 10 = 88.5% of the book.
- Bridgewater Associates' 2026-06-30 13F has 997 positions, with SPY (16.3%) and IVV (9.2%) as the two largest lines; 214 NEW and 210 EXITED positions in one quarter.
- Most similar pair by weight (cosine 0.49): Appaloosa vs Tiger Global, 9 shared names (TSM, AMZN, META, NVDA, LRCX among them). No stock is held by all five; Amazon, Meta and Alphabet (both share classes) are each held by four.

## What is in data.json
5 funds (Berkshire Hathaway, Pershing Square, Appaloosa, Tiger Global, Bridgewater Associates). For each: latest two quarters with top 25 holdings (ticker, name, CUSIP, value, weight, shares, change vs prior quarter, prior shares/weight), the 15 largest exits, change counts, sector mix (by weight), top-10 weight, effective N and turnover. Plus `overlap` (pairwise shared count, Jaccard, cosine, overlap weight, top shared names) and `commonHoldings` (names held by 2+ of the funds).

Caveats: Pershing Square's latest ingested 13F is 2026-03-31 (the others are 2026-06-30), and Q3 2026 filings (due 2026-11-16) were not yet in the database at export. Sectors come from SEC SIC codes via `sectorFromSic`, so ETFs and some foreign issuers show as "Unknown" (26% of Bridgewater's book).

## How the sample was produced
Read-only export, no app code run, nothing written to the project:
```
python3 -I scripts/export_whale.py data.json
```
The script opens `whale-tracker/data/whale.db` with `?mode=ro` and reads only `investors`, `filings`, `holdings`, `securities` (public SEC-derived data). It mirrors `getHoldings`, `investorStats` and `similarity` from `src/lib/analytics.ts`. No data from My portfolio, books, trades, positions, watches, alerts or settings is read. Snapshot taken 2026-11-19.
