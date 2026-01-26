-- SpentWorth Engagement Features Migration
-- Run this SQL in Supabase SQL Editor

-- 1. User Sources (My Accounts) - Track bank accounts/cards for upload reminders
create table if not exists user_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  name text not null, -- e.g., "Chase Checking", "Amex Gold"
  source_type text not null default 'bank', -- bank | credit_card | investment | other
  institution text, -- e.g., "Chase", "American Express"
  
  -- Upload tracking
  last_uploaded_at timestamptz,
  upload_reminder_days int not null default 7, -- Remind after X days
  
  -- CSV mapping (saved for frictionless re-uploads)
  csv_mapping jsonb, -- { dateColumn: 0, amountColumn: 1, ... }
  
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_sources_user on user_sources(user_id, enabled);

-- 2. Notification Preferences
create table if not exists notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  
  -- Daily Brief Email
  daily_brief_enabled boolean not null default false,
  daily_brief_time time not null default '09:00:00', -- Local time preference (9:00 AM)
  daily_brief_timezone text not null default 'America/New_York',
  daily_brief_last_sent timestamptz,
  
  -- Upload Reminders
  upload_reminder_enabled boolean not null default true,
  upload_reminder_email boolean not null default false, -- Also send via email?
  
  -- Review Inbox
  review_inbox_enabled boolean not null default true,
  review_inbox_daily_goal int not null default 5, -- Items to clear per day
  
  -- Weekly Pulse (summary email)
  weekly_pulse_enabled boolean not null default true,
  weekly_pulse_day int not null default 1, -- 0=Sunday, 1=Monday, etc.
  weekly_pulse_last_sent timestamptz,
  
  -- In-app notifications
  show_upload_nudges boolean not null default true,
  show_achievement_badges boolean not null default true,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Review Inbox Items (actionable items queue)
create table if not exists review_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  item_type text not null, -- uncategorized | rule_suggestion | duplicate_candidate | subscription_candidate | transfer_confirm
  
  -- Reference to the transaction(s) involved
  transaction_id uuid references transactions(id) on delete cascade,
  raw_transaction_id uuid references raw_transactions(id) on delete cascade,
  
  -- Item-specific data
  data jsonb not null default '{}', -- { suggestedCategory, suggestedRule, etc. }
  
  -- Status
  status text not null default 'pending', -- pending | completed | dismissed | expired
  priority int not null default 50, -- Higher = more important
  
  -- Tracking
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz -- Some items expire (e.g., after new import)
);

create index if not exists idx_review_inbox_user on review_inbox(user_id, status, priority desc);
create index if not exists idx_review_inbox_tx on review_inbox(transaction_id);

-- 4. User Streaks & Achievements
create table if not exists user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  
  -- Review streak
  review_streak_current int not null default 0,
  review_streak_best int not null default 0,
  review_last_completed_at date,
  
  -- Upload streak (uploaded at least once per week)
  upload_streak_current int not null default 0,
  upload_streak_best int not null default 0,
  upload_last_at date,
  
  -- Total items cleared
  total_items_cleared int not null default 0,
  
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table user_sources enable row level security;
alter table notification_prefs enable row level security;
alter table review_inbox enable row level security;
alter table user_streaks enable row level security;

-- User sources policies
create policy "Users can view own sources"
  on user_sources for select
  using (auth.uid() = user_id);

create policy "Users can insert own sources"
  on user_sources for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sources"
  on user_sources for update
  using (auth.uid() = user_id);

create policy "Users can delete own sources"
  on user_sources for delete
  using (auth.uid() = user_id);

-- Notification prefs policies
create policy "Users can view own notification prefs"
  on notification_prefs for select
  using (auth.uid() = user_id);

create policy "Users can insert own notification prefs"
  on notification_prefs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notification prefs"
  on notification_prefs for update
  using (auth.uid() = user_id);

-- Review inbox policies
create policy "Users can view own review inbox"
  on review_inbox for select
  using (auth.uid() = user_id);

create policy "Users can insert own review inbox items"
  on review_inbox for insert
  with check (auth.uid() = user_id);

create policy "Users can update own review inbox items"
  on review_inbox for update
  using (auth.uid() = user_id);

create policy "Users can delete own review inbox items"
  on review_inbox for delete
  using (auth.uid() = user_id);

-- User streaks policies
create policy "Users can view own streaks"
  on user_streaks for select
  using (auth.uid() = user_id);

create policy "Users can insert own streaks"
  on user_streaks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own streaks"
  on user_streaks for update
  using (auth.uid() = user_id);

-- Function to create notification prefs and streaks on signup
create or replace function public.handle_new_user_engagement()
returns trigger as $$
begin
  insert into public.notification_prefs (user_id) values (new.id);
  insert into public.user_streaks (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create engagement records (add to existing trigger or create new)
drop trigger if exists on_auth_user_created_engagement on auth.users;
create trigger on_auth_user_created_engagement
  after insert on auth.users
  for each row execute procedure public.handle_new_user_engagement();

