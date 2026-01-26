-- SpentWorth Engagement Features V2 Migration
-- Subscriptions tracking, Financial Score, Enhanced Streaks
-- Run this SQL in Supabase SQL Editor

-- ============================================
-- 1. Tracked Subscriptions (Rocket Money style)
-- ============================================
create table if not exists tracked_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Merchant info
  merchant_name text not null,
  merchant_norm text not null, -- Normalized for matching
  
  -- Billing details
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  billing_cycle text not null default 'monthly', -- weekly | monthly | quarterly | yearly
  next_charge_date date,
  last_charge_date date,
  
  -- Status tracking
  status text not null default 'active', -- active | trial | canceling | canceled | paused
  is_essential boolean not null default false, -- User marked as essential
  trial_ends_at date, -- If in trial
  cancel_requested_at timestamptz, -- When user marked for cancellation
  
  -- Detection metadata
  detected_at timestamptz not null default now(),
  detection_confidence numeric(3,2) not null default 0.8, -- 0-1 confidence score
  occurrence_count int not null default 1,
  
  -- Category
  category text,
  
  -- Notes
  notes text,
  
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tracked_subs_user on tracked_subscriptions(user_id, enabled, status);
create index if not exists idx_tracked_subs_next on tracked_subscriptions(user_id, next_charge_date);
create unique index if not exists idx_tracked_subs_merchant on tracked_subscriptions(user_id, merchant_norm) where enabled = true;

-- ============================================
-- 2. Financial Score Components
-- ============================================
create table if not exists financial_scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  
  -- Overall score (0-100)
  overall_score int not null default 50,
  
  -- Component scores (0-100 each)
  budget_adherence_score int not null default 50, -- Staying within budgets
  spending_consistency_score int not null default 50, -- Avoiding spikes
  subscription_health_score int not null default 50, -- Ratio of essential to non-essential
  savings_rate_score int not null default 50, -- Investment potential captured
  goal_progress_score int not null default 50, -- On track with goals
  
  -- Investable Delta (money that could be invested)
  monthly_investable_delta numeric(12,2) not null default 0,
  annual_investable_delta numeric(12,2) not null default 0,
  
  -- Leak detection
  leak_score int not null default 50, -- How much "leaking" to non-essentials
  monthly_leak_amount numeric(12,2) not null default 0,
  
  -- Trends
  score_trend text not null default 'stable', -- improving | stable | declining
  score_change_30d int not null default 0, -- Change in last 30 days
  
  -- Calculation metadata
  last_calculated_at timestamptz not null default now(),
  calculation_period_start date,
  calculation_period_end date,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 3. Enhanced User Streaks (add columns to existing)
-- ============================================
-- Note: If user_streaks already exists, use ALTER TABLE instead
-- This creates a new enhanced version

alter table user_streaks add column if not exists 
  budget_streak_current int not null default 0;

alter table user_streaks add column if not exists 
  budget_streak_best int not null default 0;

alter table user_streaks add column if not exists 
  budget_last_under_at date;

alter table user_streaks add column if not exists 
  category_streaks jsonb not null default '{}'; -- { "Dining": { current: 5, best: 12 } }

alter table user_streaks add column if not exists 
  total_transactions_reviewed int not null default 0;

alter table user_streaks add column if not exists 
  perfect_weeks int not null default 0; -- Weeks where all budgets were met

-- ============================================
-- 4. Suggested Rules (Post-Import Guidance)
-- ============================================
create table if not exists suggested_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid references import_batches(id) on delete cascade,
  
  -- Rule details
  match_type text not null default 'contains',
  match_value text not null,
  match_field text not null default 'merchant_norm',
  
  -- Suggested action
  suggested_category text,
  suggested_kind text,
  suggested_exclude boolean not null default false,
  
  -- Confidence and impact
  confidence numeric(3,2) not null default 0.8, -- 0-1
  affected_count int not null default 0, -- How many transactions this would affect
  affected_amount numeric(12,2) not null default 0,
  
  -- Sample transactions (for display)
  sample_merchants text[] not null default '{}',
  
  -- Status
  status text not null default 'pending', -- pending | accepted | rejected | expired
  
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists idx_suggested_rules_user on suggested_rules(user_id, status);
create index if not exists idx_suggested_rules_batch on suggested_rules(batch_id);

-- ============================================
-- 5. Score History (for trend tracking)
-- ============================================
create table if not exists score_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  score_date date not null,
  overall_score int not null,
  
  -- Snapshot of component scores
  components jsonb not null default '{}',
  
  created_at timestamptz not null default now(),
  
  unique(user_id, score_date)
);

create index if not exists idx_score_history_user on score_history(user_id, score_date desc);

-- ============================================
-- Row Level Security
-- ============================================
alter table tracked_subscriptions enable row level security;
alter table financial_scores enable row level security;
alter table suggested_rules enable row level security;
alter table score_history enable row level security;

-- Tracked subscriptions policies
create policy "Users can view own subscriptions"
  on tracked_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscriptions"
  on tracked_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscriptions"
  on tracked_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete own subscriptions"
  on tracked_subscriptions for delete
  using (auth.uid() = user_id);

-- Financial scores policies
create policy "Users can view own score"
  on financial_scores for select
  using (auth.uid() = user_id);

create policy "Users can insert own score"
  on financial_scores for insert
  with check (auth.uid() = user_id);

create policy "Users can update own score"
  on financial_scores for update
  using (auth.uid() = user_id);

-- Suggested rules policies
create policy "Users can view own suggestions"
  on suggested_rules for select
  using (auth.uid() = user_id);

create policy "Users can insert own suggestions"
  on suggested_rules for insert
  with check (auth.uid() = user_id);

create policy "Users can update own suggestions"
  on suggested_rules for update
  using (auth.uid() = user_id);

create policy "Users can delete own suggestions"
  on suggested_rules for delete
  using (auth.uid() = user_id);

-- Score history policies
create policy "Users can view own score history"
  on score_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own score history"
  on score_history for insert
  with check (auth.uid() = user_id);

-- ============================================
-- Auto-create records for new users
-- ============================================
create or replace function public.handle_new_user_engagement_v2()
returns trigger as $$
begin
  insert into public.financial_scores (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_engagement_v2 on auth.users;
create trigger on_auth_user_created_engagement_v2
  after insert on auth.users
  for each row execute procedure public.handle_new_user_engagement_v2();

-- ============================================
-- Helper function: Calculate future value
-- ============================================
create or replace function calculate_future_value(
  principal numeric,
  years int,
  annual_rate numeric default 0.07
)
returns numeric as $$
begin
  return round(principal * power(1 + annual_rate, years)::numeric, 2);
end;
$$ language plpgsql immutable;

-- Example: SELECT calculate_future_value(100, 10) → $196.72
-- Example: SELECT calculate_future_value(100, 20) → $386.97

