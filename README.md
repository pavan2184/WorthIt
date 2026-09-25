<a id="readme-top"></a>

<div align="center">
  <h1>WorthIt</h1>
  <p><strong>Know when a decision pays off.</strong></p>
  <p>An interactive break-even dashboard for everyday choices, editable assumptions, and real-world tracking.</p>
  <p>
    <a href="https://frontend-cyan-kappa-83.vercel.app"><strong>Open the live app »</strong></a>
    <br /><br />
    <a href="#demo-flow">View demo flow</a>
    &middot;
    <a href="https://github.com/pavan2184/WorthIt/issues/new">Report a bug</a>
    &middot;
    <a href="https://github.com/pavan2184/WorthIt/issues/new">Request a feature</a>
  </p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&amp;logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&amp;logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&amp;logoColor=white" alt="PostgreSQL" />
</p>

## Live Demo

- Frontend: https://frontend-cyan-kappa-83.vercel.app
- Backend health: https://backend-phi-inky-78.vercel.app/health

The live Vercel deployment uses the backend's in-memory fallback unless
Supabase environment variables are configured in Vercel.

## What It Does

- Opens demo-safe workflow cards for transport, streaming, gym, camera, and
  coworking choices, while still accepting custom decision prompts.
- Parses common decision prompts into a structured model with editable costs,
  usage, hidden costs, and confidence assumptions.
- Calculates total cost, break-even usage, scenario comparisons, chart points,
  savings, and a WorthIt Score.
- Lets users save decisions, reopen them, and compare aggregate net gain/loss.
- Adds a live tracker for actual usage, recurring expenses, and matched
  alternative costs such as would-have-been GrabBike trips.
- Supports Supabase persistence, MongoDB fallback, and an in-memory fallback for
  local demos.

## Demo Flow

1. Open the app and choose the `Monthly scooter rental vs GrabBike` workflow
   card.
2. Review the generated assumptions and hidden costs.
3. Adjust rental, fuel, parking, GrabBike fare, or trips per day.
4. Start the live tracker.
5. Log a scooter trip with distance, duration, and matched GrabBike cost.
6. Show how live savings, projected savings, and break-even progress update.

The landing page also includes ready-made workflows for Netflix vs pay-per-view,
gym membership vs day pass, buying vs renting a camera, and coworking vs cafes.

## Important Note About Parsing

The current hackathon MVP uses a transparent rule-based parser for supported
decision types, not a hosted LLM. This keeps the demo deterministic and easy to
judge. The supported templates include scooter vs GrabBike, gym membership vs
day pass, camera buy vs rent, Netflix vs pay-per-view, subscription vs
pay-per-use, coworking vs cafe, and a generic fallback.

## Run Locally

Backend:

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8012
```

Frontend:

```bash
cd frontend
npm install
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8012 npm run dev -- --hostname 127.0.0.1 --port 3012
```

Open `http://127.0.0.1:3012`.

The project uses `8012` for the backend and `3012` for the frontend locally so
it does not collide with other projects using the common `8000` and `3000`
ports.

## Verification

Current local checks:

```bash
cd backend
.venv/bin/python -m pytest app/tests

cd ../frontend
npm run typecheck
npm run lint
npm run build
```

## Environment

Supabase is the recommended persistent store for decisions and live tracker
entries. Run `backend/supabase_schema.sql` in the Supabase SQL editor, then set:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` can be either a legacy `service_role` JWT key or a
newer Supabase secret key. Keep it server-side only.

The backend uses Supabase first when both variables are present. MongoDB remains
an optional fallback with `MONGODB_URI`. Without Supabase or MongoDB, the backend
uses an in-memory fallback, so saved decisions and tracker entries disappear
when the backend restarts.

## UI Palette

Use the WorthIt "Great Deal" palette for future UI work:

- Brand: Teal/Mint Green `#00A86B`
- Action accent: Warm Orange `#FF6B35`
- App background: Light Gray `#F4F6F8`

These colors are defined as Tailwind tokens in `frontend/tailwind.config.ts`.
