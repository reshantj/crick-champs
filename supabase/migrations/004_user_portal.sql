-- Crick Champs user portal data model. Additive tables avoid guessing the existing teams/tournaments schemas.
create table if not exists public.cc_teams (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete restrict,
 name text not null check(char_length(name) between 2 and 80),
 city text,
 about text,
 status text not null default 'active' check(status in ('active','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.cc_team_members (
 team_id uuid not null references public.cc_teams(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 member_role text not null default 'player' check(member_role in ('captain','player','manager')),
 joined_at timestamptz not null default now(),
 primary key(team_id,user_id)
);
create table if not exists public.cc_tournaments (
 id uuid primary key default gen_random_uuid(),
 organizer_id uuid not null references auth.users(id) on delete restrict,
 name text not null check(char_length(name) between 3 and 100),
 format text not null check(format in ('T20','ODI','T10','Test','Other')),
 city text,
 status text not null default 'draft' check(status in ('draft','open','ongoing','completed','cancelled','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.cc_teams enable row level security;
alter table public.cc_team_members enable row level security;
alter table public.cc_tournaments enable row level security;
drop policy if exists cc_teams_read_owner_or_member on public.cc_teams;
create policy cc_teams_read_owner_or_member on public.cc_teams for select to authenticated using (
 owner_id=auth.uid() or exists(select 1 from public.cc_team_members m where m.team_id=id and m.user_id=auth.uid())
);
drop policy if exists cc_teams_insert_owner on public.cc_teams;
create policy cc_teams_insert_owner on public.cc_teams for insert to authenticated with check(owner_id=auth.uid());
drop policy if exists cc_teams_update_owner on public.cc_teams;
create policy cc_teams_update_owner on public.cc_teams for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists cc_members_read_self_or_team_owner on public.cc_team_members;
create policy cc_members_read_self_or_team_owner on public.cc_team_members for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.cc_teams t where t.id=team_id and t.owner_id=auth.uid()));
drop policy if exists cc_tournaments_read on public.cc_tournaments;
create policy cc_tournaments_read on public.cc_tournaments for select to authenticated using(organizer_id=auth.uid() or status in ('open','ongoing','completed'));
drop policy if exists cc_tournaments_insert_organizer on public.cc_tournaments;
create policy cc_tournaments_insert_organizer on public.cc_tournaments for insert to authenticated with check(organizer_id=auth.uid());
drop policy if exists cc_tournaments_update_organizer on public.cc_tournaments;
create policy cc_tournaments_update_organizer on public.cc_tournaments for update to authenticated using(organizer_id=auth.uid()) with check(organizer_id=auth.uid());
grant select,insert,update on public.cc_teams to authenticated;
grant select on public.cc_team_members to authenticated;
grant select,insert,update on public.cc_tournaments to authenticated;
-- Profiles phone field is optional and only visible/editable by its owner.
alter table public.profiles add column if not exists phone text;
