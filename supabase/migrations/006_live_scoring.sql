
-- Migration 006: live cricket scoring and public spectator access.
create table if not exists public.cc_live_matches (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete restrict,
 match_title text not null,
 team_a text not null, team_b text not null,
 batting_team text not null, bowling_team text not null,
 striker text not null, non_striker text not null, bowler text not null,
 runs integer not null default 0, wickets integer not null default 0,
 legal_balls integer not null default 0,
 extras integer not null default 0,
 innings integer not null default 1 check(innings in (1,2,3,4)),
 status text not null default 'live' check(status in ('live','innings_break','completed')),
 is_public boolean not null default true,
 share_code text not null unique default replace(gen_random_uuid()::text,'-',''),
 last_event text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.cc_live_deliveries (
 id bigint generated always as identity primary key,
 match_id uuid not null references public.cc_live_matches(id) on delete cascade,
 sequence_no integer not null,
 over_number integer not null,
 ball_in_over integer not null,
 event_type text not null check(event_type in ('dot','runs','four','six','wide','no_ball','bye','leg_bye','wicket')),
 bat_runs integer not null default 0,
 extra_runs integer not null default 0,
 total_runs integer not null default 0,
 wicket boolean not null default false,
 striker text not null,
 non_striker text not null,
 bowler text not null,
 commentary text,
 created_at timestamptz not null default now(),
 unique(match_id,sequence_no)
);
alter table public.cc_live_matches enable row level security;
alter table public.cc_live_deliveries enable row level security;
drop policy if exists cc_live_match_read_public on public.cc_live_matches;
create policy cc_live_match_read_public on public.cc_live_matches for select to anon,authenticated using(is_public=true or owner_id=auth.uid());
drop policy if exists cc_live_match_insert_owner on public.cc_live_matches;
create policy cc_live_match_insert_owner on public.cc_live_matches for insert to authenticated with check(owner_id=auth.uid());
drop policy if exists cc_live_match_update_owner on public.cc_live_matches;
create policy cc_live_match_update_owner on public.cc_live_matches for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists cc_live_delivery_read_public on public.cc_live_deliveries;
create policy cc_live_delivery_read_public on public.cc_live_deliveries for select to anon,authenticated
using(exists(select 1 from public.cc_live_matches m where m.id=match_id and (m.is_public=true or m.owner_id=auth.uid())));
drop policy if exists cc_live_delivery_insert_owner on public.cc_live_deliveries;
create policy cc_live_delivery_insert_owner on public.cc_live_deliveries for insert to authenticated
with check(exists(select 1 from public.cc_live_matches m where m.id=match_id and m.owner_id=auth.uid()));
grant select on public.cc_live_matches,public.cc_live_deliveries to anon,authenticated;
grant insert,update on public.cc_live_matches to authenticated;
grant insert,delete on public.cc_live_deliveries to authenticated;
drop policy if exists cc_live_delivery_delete_owner on public.cc_live_deliveries;
create policy cc_live_delivery_delete_owner on public.cc_live_deliveries for delete to authenticated
using(exists(select 1 from public.cc_live_matches m where m.id=match_id and m.owner_id=auth.uid()));
grant usage,select on sequence public.cc_live_deliveries_id_seq to authenticated;
-- Realtime must be enabled for cc_live_matches and cc_live_deliveries in Supabase Dashboard → Database → Publications.
notify pgrst,'reload schema';
