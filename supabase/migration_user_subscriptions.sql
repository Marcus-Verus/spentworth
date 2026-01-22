-- SpentWorth User Subscriptions Schema
-- Run this SQL in Supabase SQL Editor
-- This is for user-defined recurring charges (Netflix, Spotify, etc.)

create table if not exists user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  name text not null, -- e.g., "Netflix", "Spotify", "Gym Membership"
  amount numeric(12,2) not null,
  frequency text not null default 'monthly', -- weekly | bi-weekly | monthly | quarterly | semi-annually | yearly
  
  -- Optional metadata
  category text, -- Link to spending category
  notes text,
  
  -- For "What If" calculations
  is_cancelled boolean not null default false,
  cancelled_at timestamptz,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_subs_user on user_subscriptions(user_id, is_cancelled);

-- Enable RLS
alter table user_subscriptions enable row level security;

-- Policies
create policy "Users can view own subscriptions"
  on user_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscriptions"
  on user_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscriptions"
  on user_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete own subscriptions"
  on user_subscriptions for delete
  using (auth.uid() = user_id);
