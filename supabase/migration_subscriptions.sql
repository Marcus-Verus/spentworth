-- SpentWorth Subscriptions Schema
-- Run this SQL in Supabase SQL Editor

-- Subscriptions table to track user subscription status
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Stripe identifiers
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  
  -- Subscription status
  status text not null default 'free', -- free | active | canceled | past_due | trialing
  plan text not null default 'free', -- free | pro
  interval text, -- monthly | yearly (null for free)
  
  -- Billing dates
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  canceled_at timestamptz,
  
  -- Trial info
  trial_start timestamptz,
  trial_end timestamptz,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_subscriptions_user on subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer on subscriptions(stripe_customer_id);
create index if not exists idx_subscriptions_stripe_sub on subscriptions(stripe_subscription_id);

-- Enable RLS
alter table subscriptions enable row level security;

-- Policies
create policy "Users can view own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscription"
  on subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscription"
  on subscriptions for update
  using (auth.uid() = user_id);

-- Service role can do anything (for webhooks)
create policy "Service role full access"
  on subscriptions for all
  using (auth.role() = 'service_role');

-- Function to create subscription record on user signup
create or replace function public.handle_new_user_subscription()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, status, plan)
  values (new.id, 'free', 'free');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create subscription on signup
drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute procedure public.handle_new_user_subscription();

-- Add subscription info to existing users who don't have it
insert into subscriptions (user_id, status, plan)
select id, 'free', 'free'
from auth.users
where id not in (select user_id from subscriptions);

