# SMB Agent Runtime — demo facts

**What it does.** An agent runtime for small appointment businesses (demo tenant: a dental clinic in Surat) that turns inbound WhatsApp messages into triage, urgency, and reply-draft decisions. Agents read but never write: every customer-facing draft passes a guard and lands in a human approval queue unless its intent is explicitly whitelisted.

**Stack.** Python, FastAPI, SQLAlchemy (SQLite in the sandbox, Postgres + RLS in the design), Pydantic schemas, a DB-backed job queue and worker, hash-chained audit log, Anthropic API (optional) or a rule-based stub provider, pytest.

## Facts (from code and this run)
- Eight agents are configured for the demo tenant (A1 Triage, A2 Urgency, A3 Slot Proposer, A4 Reply Copilot, A5 Reminders, A6 Review Requester, A7 Recurrence, A8 Analyst). A1 hands off to A2 only for `book`, `service_enquiry`, `complaint` and `follow_up_existing`.
- A deterministic pre-guard rejects any draft containing a number that isn't in the retrieved source facts. In the scripted demo it blocked "We are open 10:00 to 19:00 tomorrow" as `unsourced_number`.
- Write tools are structurally refused (`build_toolbelt` raises `WriteToolRefused`), and the only send path is `review.enqueue_outbound`.
- Demo tenant caps: INR 150/day of model spend and 400 customer messages/day. The auto-send whitelist covers `location_hours` and `book` only. Across the 4 recorded flows the audit chain had 22 rows and verified as intact.
- Test suite in a scratch copy: 322 passed, 1 failed (`test_family_books_on_one_phone_from_the_website`).

## The recorded flows (`flows[]`)
1. **Roman-script Gujarati booking request** → A1 `book` → A2 `routine` → A4 drafts a booking-link reply → guard pass → auto-sent, because `book` is whitelisted.
2. **"how much is a cleaning?"** → A1 `price_enquiry` → A4 drafts a holding reply and flags `missing_fact`, because the seed has no confirmed price → guard pass → **awaiting human approval**.
3. **"bahu dukhe che, turat joie che" (pain, urgent)** → A2 `immediate` with matched signals `dukhe` and `turat` → staff alert queued, and no customer draft by design.
4. **Prompt injection ("Ignore your instructions… 50% off")** → A1 escalates with `instruction_in_user_content` → A4 gives a neutral holding draft → **awaiting human approval**.

## How the sample was produced
A scratch copy of the repo was used (source and its `sandbox.db` untouched), with a fresh SQLite DB. Each message went through the sandbox's own `POST /sandbox/api/message` endpoint, and the worker loop (`run_once` + `Pipeline(get_provider())`) processed it with `LLM_PROVIDER=stub`. Agent runs, decisions, guard verdicts, outbound messages and audit rows were read back from the DB. The phone number is masked and booking-link tokens are replaced with `<token>`.

## Must be labelled
- **Stub, not a model:** every agent output comes from `stub_provider.py` (`stub-rules-v1`), which is keyword rules. It says nothing about real LLM quality. Token counts are runtime estimates, not billed usage. No paid API was called.
- **Scripted:** `scriptedGuardDemo` is stdout from `scripts/demo.py`, whose model replies are hand-written fixtures (EchoProvider).
- The tenant (Smile Dental Care) and customer "Mehul" are fictional seed data.
