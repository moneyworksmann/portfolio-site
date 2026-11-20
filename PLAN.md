# Public site plan — for review

Separate site, free (Vercel Hobby), no login, no connection to the private hub's data.
Facts come from your résumé (Patel.Mann-Resume.pdf) and the project READMEs.
Anything marked **[YOU]** needs your answer; nothing is invented.

## Pages

1. **/ (recruiter landing)**
2. **/work** — all projects, filterable: Finance & data · AI agents
3. **/work/[project]** — case study + interactive demo per project
4. **/writing** + **/writing/[post]** — published posts only (drafts with `[VERIFY]` stay hidden)
5. **/about** — longer story, experience, skills
6. **/resume** — résumé PDF download (contact details trimmed, see below)

## Style (see DESIGN.md)

Structure modelled on the Nempanthh site you pointed to: a quiet white home with one big
statement and a Menu mark; the menu opens a mosaic of coloured tiles (Work, Now, Writing,
About, Résumé, Demos, LinkedIn, Contact), each carrying one real figure; inner pages are dark
with faint grid lines and a slim left rail. Our own colours, mark and words.

## Landing page sections (in order)

1. **Hero (white, full screen)** — "Mann Patel studies finance and accounting at Rutgers and builds
   tools that turn market data into decisions." Under it, small: *Work · LinkedIn · Résumé*.
   Bottom-left: the MP mark that opens the tile menu. Scrolling continues into the sections below.
2. **Now** — what I'm working on this month **[YOU: confirm or edit]**
   - Whale Tracker: comparing my own trades against 13F "whales"
   - QuantFlow: point-in-time signal engine, honest backtests
   - Weekly macro notes (energy, inflation, earnings)
   - Graduating Dec 2026; looking for **[YOU: e.g. 2027 analyst roles / internships in …]**
3. **Selected work** — 4 featured projects with a real data preview each (not icon cards):
   Whale Tracker · QuantFlow · Equity research multi-agent · Credit-risk SQL pipeline. Link to /work for the rest.
4. **How I work** — 3 short proof points drawn from the READMEs (point-in-time data, free/open data
   sources, every number traceable). No skill bars or percentages.
5. **Writing** — latest 3 published posts with date and one-line takeaway.
6. **Experience strip** — Rutgers Health & Rec (Business Office Assistant), Rutgers Recreation
   (Building Supervisor), Beta Alpha Psi VITA (50+ households), Rutgers Learning Center (Peer Tutor).
7. **Contact** — LinkedIn, email **[YOU: Rutgers or Gmail?]**, résumé. Phone number not shown.

## Demos (interactive, run on real sample output; no API keys, no cost per visitor)

| Project | Demo |
|---|---|
| Whale Tracker | Pick 2–3 funds → holdings overlap, quarter changes, sector mix (13F snapshot) |
| QuantFlow | Strategy sleeves → blended signal list, equity curve vs SPY (from a real run) |
| Equity research multi-agent | Step through one ticker's 16-agent run → final report |
| Equity Desk | Browse one generated research report (valuation range, SWOT, exhibits) |
| Credit-risk SQL | Raw vs cleaned rows side by side; default rate by grade/term; the SQL that did it |
| Portfolio optimizer | Upload-free: sample holdings → frontier and suggested weights |
| Travel advisor | Replay one recorded 10-agent plan (waves, then the itinerary) |
| SkyFuel AI | What-if sliders (cruise level, payload) on the trained surrogate's sample grid + SHAP |
| SMB agent runtime | Replay a triage → reply-draft → human-approve flow from the sandbox |
| Retail inventory | Reorder recommendations on the seeded demo shop |

Each demo shows "Sample data from <date>" so nobody mistakes it for live.

## Hidden from the public site

Private hub, watchlist, holdings, sheet data, Paper Trader, phone number, anything from Gmail/Calendar.

## Then: the private hub

After the public site, I show you 2–3 fresh directions for the hub before changing it.
