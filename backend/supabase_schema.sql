create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracker_entries (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions(id) on delete cascade,
  option_key text not null default 'option_a'
    check (option_key in ('option_a', 'option_b')),
  spend_kind text not null default 'variable'
    check (spend_kind in ('variable', 'fixed')),
  expense_frequency text not null default 'per_use'
    check (expense_frequency in ('per_use', 'per_day', 'per_month', 'per_year')),
  date date not null,
  uses numeric not null default 0 check (uses >= 0),
  option_a_spend numeric not null default 0 check (option_a_spend >= 0),
  option_b_spend numeric not null default 0 check (option_b_spend >= 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists tracker_entries_decision_date_idx
  on public.tracker_entries (decision_id, date, created_at);
