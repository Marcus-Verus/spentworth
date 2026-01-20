-- Migration: Add Goals and Tags tables
-- Run this if you already have the base schema

-- 8. Spending Goals
create table if not exists spending_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  name text not null,
  goal_type text not null default 'reduce_category',
  
  target_category text,
  target_merchant text,
  target_amount numeric(12,2) not null,
  
  current_period_spent numeric(12,2) not null default 0,
  period_start date,
  
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
  color text not null default '#10b981',
  
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

-- Enable RLS on new tables
alter table spending_goals enable row level security;
alter table custom_tags enable row level security;
alter table transaction_tags enable row level security;

-- Goals policies
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

-- Tags policies
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
