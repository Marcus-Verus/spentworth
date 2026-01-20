-- SpentWorth MVP Database Schema
-- Run this SQL in Supabase SQL Editor

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Import batches
create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_name text,
  original_filename text,
  uploaded_at timestamptz not null default now(),
  status text not null default 'parsed', -- parsed | committed | deleted
  date_min date,
  date_max date,
  rows_total int not null default 0,
  rows_included int not null default 0,
  rows_excluded int not null default 0,
  rows_needs_review int not null default 0,
  rows_duplicates int not null default 0,
  total_included_spend numeric(12,2) not null default 0,
  total_excluded_amount numeric(12,2) not null default 0,
  currency text not null default 'USD'
);

create index if not exists idx_import_batches_user on import_batches(user_id, uploaded_at desc);

-- 2. Raw transactions (staging)
create table if not exists raw_transactions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  row_index int not null,
  raw jsonb not null,

  parse_status text not null default 'ok', -- ok | error
  parse_error text,

  -- extracted fields
  date_raw text,
  date_chosen date,
  amount_raw text,
  amount_signed numeric(12,2),
  description_raw text,
  merchant_raw text,
  merchant_norm text,

  -- classification
  kind text not null default 'unknown',
  kind_reason text,
  included_in_spend boolean not null default false,
  category text,
  is_duplicate boolean not null default false,
  duplicate_of uuid references raw_transactions(id),

  created_at timestamptz not null default now()
);

create index if not exists idx_raw_tx_batch on raw_transactions(batch_id, row_index);
create index if not exists idx_raw_tx_user on raw_transactions(user_id, date_chosen desc);
create index if not exists idx_raw_tx_kind on raw_transactions(user_id, kind, included_in_spend);

-- 3. Committed transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid references import_batches(id) on delete set null,

  date date not null,
  invest_date date not null,
  amount numeric(12,2) not null,
  direction text not null default 'debit',
  merchant text,
  merchant_norm text,
  description text,

  kind text not null,
  category text,
  included_in_spend boolean not null default false,

  ticker_symbol text not null default 'SPY',
  future_value numeric(12,2),
  growth_delta numeric(12,2),
  calc_method text not null default 'adj_close_ratio',
  calc_error text,

  matched_refund_for uuid references transactions(id),
  matched_refund_to uuid references transactions(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tx_user_date on transactions(user_id, date desc);
create index if not exists idx_tx_user_kind on transactions(user_id, kind, included_in_spend);
create index if not exists idx_tx_user_merchant on transactions(user_id, merchant_norm);

-- 4. Transaction overrides
create table if not exists transaction_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_transaction_id uuid references raw_transactions(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete cascade,

  override_kind text,
  override_included_in_spend boolean,
  override_category text,
  override_merchant text,

  created_at timestamptz not null default now()
);

create index if not exists idx_overrides_user on transaction_overrides(user_id, created_at desc);
create unique index if not exists idx_overrides_raw_tx on transaction_overrides(raw_transaction_id) where raw_transaction_id is not null;

-- 5. Merchant rules
create table if not exists merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  match_type text not null default 'contains',
  match_value text not null,
  match_field text not null default 'merchant_norm',

  action_exclude boolean not null default false,
  set_kind text,
  set_category text,

  priority int not null default 100,
  enabled boolean not null default true,

  created_at timestamptz not null default now()
);

create index if not exists idx_rules_user on merchant_rules(user_id, enabled, priority);

-- 6. Price cache
create table if not exists price_cache (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  price_date date not null,
  adj_close numeric(18,6),
  close numeric(18,6),
  source text,
  fetched_at timestamptz not null default now(),

  unique(ticker, price_date)
);

create index if not exists idx_price_cache_ticker_date on price_cache(ticker, price_date);

-- 7. User preferences
create table if not exists user_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_ticker text not null default 'SPY',
  invest_delay_trading_days int not null default 1,
  allow_fallback_for_all_tickers boolean not null default false
);

-- 8. Spending Goals
create table if not exists spending_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  name text not null,
  goal_type text not null default 'reduce_category', -- reduce_category | reduce_merchant | save_monthly | invest_target
  
  -- Target configuration
  target_category text, -- for reduce_category
  target_merchant text, -- for reduce_merchant
  target_amount numeric(12,2) not null, -- monthly limit or savings target
  
  -- Progress tracking
  current_period_spent numeric(12,2) not null default 0,
  period_start date,
  
  -- Investment projection
  project_years int default 10,
  projected_value numeric(12,2),
  
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_goals_user on spending_goals(user_id, enabled);

-- 9. Custom Tags
create table if not exists custom_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  name text not null,
  color text not null default '#10b981', -- hex color
  
  created_at timestamptz not null default now()
);

create unique index if not exists idx_tags_user_name on custom_tags(user_id, name);

-- 10. Transaction Tags (junction table)
create table if not exists transaction_tags (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  tag_id uuid not null references custom_tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  created_at timestamptz not null default now(),
  
  unique(transaction_id, tag_id)
);

create index if not exists idx_tx_tags_tx on transaction_tags(transaction_id);
create index if not exists idx_tx_tags_tag on transaction_tags(tag_id);

-- Row Level Security Policies
alter table import_batches enable row level security;
alter table raw_transactions enable row level security;
alter table transactions enable row level security;
alter table transaction_overrides enable row level security;
alter table merchant_rules enable row level security;
alter table user_prefs enable row level security;
alter table spending_goals enable row level security;
alter table custom_tags enable row level security;
alter table transaction_tags enable row level security;

-- Import batches policies
create policy "Users can view own import batches"
  on import_batches for select
  using (auth.uid() = user_id);

create policy "Users can insert own import batches"
  on import_batches for insert
  with check (auth.uid() = user_id);

create policy "Users can update own import batches"
  on import_batches for update
  using (auth.uid() = user_id);

create policy "Users can delete own import batches"
  on import_batches for delete
  using (auth.uid() = user_id);

-- Raw transactions policies
create policy "Users can view own raw transactions"
  on raw_transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own raw transactions"
  on raw_transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own raw transactions"
  on raw_transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own raw transactions"
  on raw_transactions for delete
  using (auth.uid() = user_id);

-- Transactions policies
create policy "Users can view own transactions"
  on transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on transactions for delete
  using (auth.uid() = user_id);

-- Transaction overrides policies
create policy "Users can view own overrides"
  on transaction_overrides for select
  using (auth.uid() = user_id);

create policy "Users can insert own overrides"
  on transaction_overrides for insert
  with check (auth.uid() = user_id);

create policy "Users can update own overrides"
  on transaction_overrides for update
  using (auth.uid() = user_id);

create policy "Users can delete own overrides"
  on transaction_overrides for delete
  using (auth.uid() = user_id);

-- Merchant rules policies
create policy "Users can view own rules"
  on merchant_rules for select
  using (auth.uid() = user_id);

create policy "Users can insert own rules"
  on merchant_rules for insert
  with check (auth.uid() = user_id);

create policy "Users can update own rules"
  on merchant_rules for update
  using (auth.uid() = user_id);

create policy "Users can delete own rules"
  on merchant_rules for delete
  using (auth.uid() = user_id);

-- User prefs policies
create policy "Users can view own prefs"
  on user_prefs for select
  using (auth.uid() = user_id);

create policy "Users can insert own prefs"
  on user_prefs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own prefs"
  on user_prefs for update
  using (auth.uid() = user_id);

-- Price cache is public read (no user-specific data)
alter table price_cache enable row level security;

create policy "Anyone can read price cache"
  on price_cache for select
  using (true);

create policy "Authenticated users can insert price cache"
  on price_cache for insert
  with check (auth.role() = 'authenticated');

-- Function to create user prefs on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_prefs (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create user prefs
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Spending goals policies
create policy "Users can view own goals"
  on spending_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on spending_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on spending_goals for update
  using (auth.uid() = user_id);

create policy "Users can delete own goals"
  on spending_goals for delete
  using (auth.uid() = user_id);

-- Custom tags policies
create policy "Users can view own tags"
  on custom_tags for select
  using (auth.uid() = user_id);

create policy "Users can insert own tags"
  on custom_tags for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tags"
  on custom_tags for update
  using (auth.uid() = user_id);

create policy "Users can delete own tags"
  on custom_tags for delete
  using (auth.uid() = user_id);

-- Transaction tags policies
create policy "Users can view own transaction tags"
  on transaction_tags for select
  using (auth.uid() = user_id);

create policy "Users can insert own transaction tags"
  on transaction_tags for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own transaction tags"
  on transaction_tags for delete
  using (auth.uid() = user_id);
