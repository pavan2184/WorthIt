# WorthIt Project Status

Last updated: 2026-06-19

## Current State

WorthIt is an interactive decision dashboard focused on break-even decisions,
with the primary demo flow centered on quick-start workflow cards such as
scooter rental vs GrabBike.

The app currently includes:

- Landing page with a brand-green centered hero, curated workflow cards, and a
  natural-language custom decision input.
- Rule-based parser for scooter, gym, camera, Netflix/pay-per-view,
  subscription/pay-per-use, coworking/cafe, and generic decisions.
- Editable assumption dashboard.
- Deterministic backend break-even calculator.
- Usage sliders and instant recalculation.
- WorthIt score, break-even card, scenario table, verdict card, and cost chart.
- Hidden cost checklist.
- Save decision flow.
- Decision history page.
- Live tracker page for saved decisions.
- Supabase-backed persistence with MongoDB and in-memory fallbacks.
- Submission-facing README with the current local run commands, supported demo
  flow, and an explicit note that parsing is rule-based for the hackathon MVP.
- Vercel deployment:
  - Frontend: `https://frontend-cyan-kappa-83.vercel.app`
  - Backend health: `https://backend-phi-inky-78.vercel.app/health`
  - The deployed backend uses in-memory persistence unless Supabase environment
    variables are configured in Vercel.

## Frontend

Frontend stack:

- Next.js
- TypeScript
- Tailwind CSS
- Recharts
- lucide-react

Current frontend routes:

- `/`
- `/decision/new`
- `/decision/[id]`
- `/decisions`
- `/history`
- `/tracker/[id]`

Recent UI updates:

- Home page now opens with a brand-green, centered hackathon-style landing hero:
  small status line, large `WorthIt` title, concise value proposition, and Get
  Started/View Decisions CTAs. The decision workspace now leads with five
  quick-start workflow cards for scooter/GrabBike, Netflix/pay-per-view, gym,
  camera, and coworking/cafes before the custom prompt input.
- `AppHeader` now supports a brand variant for the landing page while keeping
  the existing light header style on workspace routes.
- Home page currency selection now lives in the right-side Currency status
  panel and passes through `/decision/new` into the parse API and generated
  decision payload. Built-in estimate amounts are roughly scaled for supported
  currencies instead of only relabeling VND defaults.
- The right-side home-page Mode status card has been removed. The Period panel
  now supports 1 day, 1 week, 1 month, 1 year, and custom periods in days,
  weeks, months, or years, then passes the converted day count into the
  generated decision.
- Input mode selection now uses radio controls for the mutually exclusive
  choice between user-owned values and WorthIt estimates.
- App-style dashboard UI using the selected teal/orange value palette.
- Follow-up question flow for users who have their own values.
- Break-even card moved above assumptions.
- Option detail buttons and editable option/cost controls.
- Save action updated into live tracker entry point from the dashboard.
- Tracker page has an "Edit starting information" link.
- Tracker page includes a "Log new activity" component above actual usage metrics.

## Backend

Backend stack:

- FastAPI
- Pydantic
- Deterministic Python calculator
- Supabase REST persistence
- MongoDB fallback
- In-memory fallback

Current backend endpoints:

- `GET /health`
- `POST /api/parse`
- `POST /api/decisions/calculate`
- `POST /api/decisions`
- `GET /api/decisions`
- `GET /api/decisions/{decision_id}`
- `DELETE /api/decisions/{decision_id}`
- `GET /api/trackers/{decision_id}`
- `POST /api/trackers/{decision_id}/entries`

## Persistence

Supabase is now the preferred storage layer.

Files added or updated:

- `backend/supabase_schema.sql`
- `backend/.env.example`
- `backend/app/core/config.py`
- `backend/app/db/mongo.py`
- `backend/pyproject.toml`

Notes:

- `backend/.env` is used locally and is not committed.
- `SUPABASE_URL` supports both project-root URLs and `/rest/v1` URLs.
- Supabase service keys must stay server-side.
- Decision rows and tracker entries are persisted through Supabase when
  configured.
- The Vercel backend deployment falls back to in-memory storage when Supabase
  variables are not set.

## Live Tracker

The live tracker now supports:

- Logging activity by option.
- Logging expense frequency as per-use, daily, monthly, or yearly.
- Correctly normalizing recurring costs by time period.
- Keeping monthly rental values from being multiplied by usage.
- Tracking actual uses from daily/monthly/yearly logs when usage is entered.
- Showing projected savings, live savings to date, break-even progress, and
  actual uses logged.

Latest tracker logic decisions:

- Distance travelled, time of trip, and matched GrabBike cost only appear for
  Option A per-use trip logs.
- Monthly rental, daily recurring, and yearly recurring entries do not show trip
  distance fields.
- Matched GrabBike offset is only counted for Option A per-use entries.
- Recurring Option A costs cannot accidentally create matched GrabBike offsets.
- Matched trip details are stored in the entry note.
- Matched GrabBike cost uses the existing `option_b_spend` field, avoiding a
  Supabase schema migration for now.

## Tests

Backend tests currently cover:

- Core calculator behavior.
- Rule-based parser behavior.
- Supabase URL normalization.
- Tracker projection from logged usage.
- Option B usage logs.
- Monthly recurring expense normalization.
- Recurring entries counting usage.
- Matched would-have-been GrabBike costs.
- Preventing recurring Option A costs from creating matched trip offsets.

Latest verified checks:

- `.venv/bin/python -m pytest app/tests`: 20 passed
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed
- Runtime probes confirmed `GET /health`, the home page, `/decisions`, the new
  decision route, and period/currency query parameters return successfully,
  including a multi-year day count.

Recent live API smoke tests verified:

- Supabase-backed save, tracker entry, reload, and cleanup.
- Monthly rental entries do not multiply rental by uses.
- Daily entries update `actual_uses`.
- Matched GrabBike costs offset live savings for per-use scooter trips.
- Monthly rental entries with accidental `option_b_spend` do not create matched
  GrabBike offsets.

## Running Locally

Current local development URLs:

- Frontend: `http://127.0.0.1:3012`
- Backend: `http://127.0.0.1:8012`

Port notes:

- Frontend uses `3012` and backend uses `8012` because default ports `3000`
  and `8000` may be occupied by other local projects.
- Run the frontend with
  `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8012 npm run dev -- --hostname 127.0.0.1 --port 3012`.

## Known Limitations

- Browser click/type automation has not been available in this session, so UI
  behavior has been verified through build checks, HTTP probes, backend tests,
  and API smoke tests rather than an automated browser interaction run.
- Matched trip distance/time are currently stored in the note rather than first
  class database columns.
- There is no authentication yet.
- AI parsing is still optional/future work; current MVP parser is rule-based.
- No live GrabBike price scraping is implemented.

## Next Suggested Updates

- Add first-class tracker columns for distance, trip time, and matched
  alternative cost if this data needs filtering or charting.
- Add browser-based Playwright tests for the tracker form.
- Add docs for API contract, data model, and security review if the project
  starter docs are adopted fully.
