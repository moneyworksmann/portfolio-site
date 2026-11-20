# Multi-agent Travel Advisor — demo facts

**What it does.** You describe a trip, and agents search flights across the whole date window, research the destination in parallel waves, and build a day-by-day itinerary. A repair step fixes problems in code, and then a deterministic verifier checks the plan before you see it. Prices, times and ratings always come from APIs, never from the language model.

**Stack.** Python, asyncio, Pydantic schemas, Streamlit, Anthropic API (paid mode) or local Ollama (free mode), SerpApi Google Flights/Hotels, Google Places/Routes or OpenStreetMap (Nominatim, Overpass, OSRM), Wikivoyage, Open-Meteo, file cache with per-source expiry times, pytest.

## Facts (from code and this run)
- Waves (`agents/orchestrator.py`): wave 0 picks a destination if none is given. Wave 1 runs flights, stays, places, local flavor, nightlife and conditions in parallel, plus drive when driving is realistic. Wave 2 runs transport and hotels, plus route places and drive-vs-fly. Wave 3 runs synthesizer → repair → verifier, with one retry if the verifier finds errors.
- Flights are scored in Python, not by the model. Free mode caps the search at 6 date pairs, and this run searched 6.
- Chosen flight in this run: Frontier ORD→DFW nonstop on Dec 5, 170 min, $166 round trip. Chosen hotel: The Madison Hotel at Bishop Arts, $370 for 3 nights. Both are cached SerpApi data from 2026-10-15.
- Repair made 5 changes to day 1, for example moving activities after the 12:50 landing and trimming to 6 stops for a balanced pace. The verifier then reported 0 issues on the first attempt.
- The run made 5 local-model calls (14,928 tokens) and had 49 cache hits. It took 1,060 s on a laptop with qwen2.5:7b.

## How the sample was produced
A scratch copy of the repo was run in free mode on 2026-11-19 (`replay_run.py`). No `.env` was loaded and no API key was used.
- **Flights and hotels:** answered only from responses already in the project's cache, recorded 2026-10-15. A guard refused any search that wasn't cached, and none were needed. No SerpApi, Google or Anthropic call was made.
- **Language-model agents:** the local Ollama model (free), with LLM answers reused from the cache where the prompt matched.
- **Other services:** free public services were called live. Hosts contacted: Open-Meteo, Nominatim, Overpass, OSRM, Wikipedia, GitHub raw (airport list) and localhost (Ollama).

## Must be labelled
- **Replay:** the trip request is a TripSpec I rebuilt from the cached searches (ORD→DFW, 3–8 Dec 2026, 2–5 days, 1 traveler, no budget). The interests (`food, nightlife, museums, veggie food`) were chosen for the replay, not taken from a user. Flight and hotel prices are as of 2026-10-15.
- **Free-mode quality:** the itinerary was written by a 7B local model, not Claude. Some blocks are weak, for example "Lunch" at 17:48 after repair and vague "Exploring Uptown" labels. Venues come from OpenStreetMap, which has no ratings.
- **Gap:** `route_places` failed with a network error during the run, so there are no stops-on-the-way.
- `waves[].output` lists are trimmed to 8 items and long strings to 400 characters.
