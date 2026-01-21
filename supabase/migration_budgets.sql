-- SpentWorth Budgets Migration
-- Run this SQL in Supabase SQL Editor

-- Budgets table - monthly spending limits per category
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  category text not null,
  monthly_limit numeric(12,2) not null,
  
  -- Soft tracking (user can mark as paused without deleting)
  enabled boolean not null default true,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- One budget per category per user
  unique(user_id, category)
);

create index if not exists idx_budgets_user on budgets(user_id, enabled);

-- Row Level Security
alter table budgets enable row level security;

create policy "Users can view own budgets"
  on budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert own budgets"
  on budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own budgets"
  on budgets for update
  using (auth.uid() = user_id);

create policy "Users can delete own budgets"
  on budgets for delete
  using (auth.uid() = user_id);

