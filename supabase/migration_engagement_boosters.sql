-- SpentWorth Engagement Boosters Migration
-- Adds: Philosophy Presets, Share Reports support
-- Run this SQL in Supabase SQL Editor

-- ============================================
-- 1. Philosophy Preset for User Preferences
-- ============================================
-- Adjusts insight tone and messaging style

alter table user_prefs add column if not exists 
  philosophy_preset text not null default 'comfortable_saver';
-- Options: comfortable_saver | aggressive_builder | debt_first | family_budget

-- Add comment for documentation
comment on column user_prefs.philosophy_preset is 
  'User insight tone preference: comfortable_saver (gentle, small wins), aggressive_builder (bold projections), debt_first (debt payoff focus), family_budget (practical household)';

-- ============================================
-- 2. Share Reports Table (for tracking/analytics)
-- ============================================
-- Stores generated share reports for potential future features

create table if not exists share_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Report configuration
  report_type text not null default 'year_projection', -- year_projection | category_breakdown | subscription_savings
  report_year int not null, -- e.g., 2025
  projection_year int not null, -- e.g., 2045
  
  -- Calculated values at time of generation
  total_spent numeric(12,2) not null,
  projected_future_value numeric(12,2) not null,
  top_category text,
  top_category_spent numeric(12,2),
  
  -- Share tracking
  share_token text unique, -- For shareable URLs (optional)
  view_count int not null default 0,
  
  created_at timestamptz not null default now()
);

create index if not exists idx_share_reports_user on share_reports(user_id, created_at desc);
create index if not exists idx_share_reports_token on share_reports(share_token) where share_token is not null;

-- RLS for share_reports
alter table share_reports enable row level security;

drop policy if exists "Users can view own share reports" on share_reports;
create policy "Users can view own share reports"
  on share_reports for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own share reports" on share_reports;
create policy "Users can insert own share reports"
  on share_reports for insert
  with check (auth.uid() = user_id);

-- Public can view by share token (for shared links)
drop policy if exists "Anyone can view shared reports by token" on share_reports;
create policy "Anyone can view shared reports by token"
  on share_reports for select
  using (share_token is not null);

-- ============================================
-- 3. Update notification_prefs with philosophy
-- ============================================
-- Mirror philosophy setting in notification_prefs for email personalization

alter table notification_prefs add column if not exists 
  philosophy_preset text not null default 'comfortable_saver';

