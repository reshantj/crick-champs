
-- Crick Champs repair migration 005: safe, additive core schema.
create table if not exists public.cc_teams (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete restrict,
 name text not null check(char_length(name) between 2 and 80),
 city text, about text, status text not null default 'active' check(status in ('active','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.cc_team_members (
 team_id uuid not null references public.cc_teams(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 member_role text not null default 'player' check(member_role in ('captain','player','manager')),
 joined_at timestamptz not null default now(), primary key(team_id,user_id)
);
create table if not exists public.cc_tournaments (
 id uuid primary key default gen_random_uuid(),
 organizer_id uuid not null references auth.users(id) on delete restrict,
 name text not null check(char_length(name) between 3 and 100),
 format text not null check(format in ('T20','ODI','T10','Test','Other')),
 city text, status text not null default 'draft' check(status in ('draft','open','ongoing','completed','cancelled','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.cc_players (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete set null,
 created_by uuid not null references auth.users(id) on delete restrict,
 team_id uuid references public.cc_teams(id) on delete restrict,
 display_name text not null check(char_length(display_name) between 2 and 100),
 batting_hand text check(batting_hand in ('Right','Left')), bowling_style text,
 created_at timestamptz not null default now()
);
create table if not exists public.cc_presence (
 user_id uuid primary key references auth.users(id) on delete cascade,
 last_seen_at timestamptz not null default now()
);
create table if not exists public.admin_audit_logs (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id) on delete restrict,
 action text not null check(char_length(action) between 1 and 100),
 details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.subscription_records (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete restrict,
 plan_code text not null check(plan_code in ('community_free','pro_player','tournament_manager')),
 status text not null check(status in ('trialing','active','past_due','cancelled','expired')),
 provider text, provider_subscription_id text unique, started_at timestamptz not null default now(),
 current_period_end timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.payment_transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete restrict,
 provider text not null, provider_transaction_id text not null unique,
 transaction_type text not null check(transaction_type in ('payment','refund')),
 amount_paise bigint not null check(amount_paise >= 0), currency text not null default 'INR',
 status text not null check(status in ('pending','succeeded','failed','refunded')),
 related_transaction_id uuid references public.payment_transactions(id), created_at timestamptz not null default now()
);

alter table public.cc_teams enable row level security;
alter table public.cc_team_members enable row level security;
alter table public.cc_tournaments enable row level security;
alter table public.cc_players enable row level security;
alter table public.cc_presence enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.subscription_records enable row level security;
alter table public.payment_transactions enable row level security;

drop policy if exists cc_teams_read_owner_or_member on public.cc_teams;
create policy cc_teams_read_owner_or_member on public.cc_teams for select to authenticated
using(owner_id=auth.uid() or exists(select 1 from public.cc_team_members m where m.team_id=id and m.user_id=auth.uid()));
drop policy if exists cc_teams_insert_owner on public.cc_teams;
create policy cc_teams_insert_owner on public.cc_teams for insert to authenticated with check(owner_id=auth.uid());
drop policy if exists cc_teams_update_owner on public.cc_teams;
create policy cc_teams_update_owner on public.cc_teams for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists cc_members_read_self_or_team_owner on public.cc_team_members;
create policy cc_members_read_self_or_team_owner on public.cc_team_members for select to authenticated
using(user_id=auth.uid() or exists(select 1 from public.cc_teams t where t.id=team_id and t.owner_id=auth.uid()));
drop policy if exists cc_tournaments_read on public.cc_tournaments;
create policy cc_tournaments_read on public.cc_tournaments for select to authenticated
using(organizer_id=auth.uid() or status in ('open','ongoing','completed'));
drop policy if exists cc_tournaments_insert_organizer on public.cc_tournaments;
create policy cc_tournaments_insert_organizer on public.cc_tournaments for insert to authenticated with check(organizer_id=auth.uid());
drop policy if exists cc_tournaments_update_organizer on public.cc_tournaments;
create policy cc_tournaments_update_organizer on public.cc_tournaments for update to authenticated using(organizer_id=auth.uid()) with check(organizer_id=auth.uid());
drop policy if exists cc_players_read_creator_or_team_owner on public.cc_players;
create policy cc_players_read_creator_or_team_owner on public.cc_players for select to authenticated
using(created_by=auth.uid() or user_id=auth.uid() or exists(select 1 from public.cc_teams t where t.id=team_id and t.owner_id=auth.uid()));
drop policy if exists cc_players_insert_creator on public.cc_players;
create policy cc_players_insert_creator on public.cc_players for insert to authenticated with check(created_by=auth.uid());
drop policy if exists cc_players_update_creator on public.cc_players;
create policy cc_players_update_creator on public.cc_players for update to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
drop policy if exists cc_presence_self on public.cc_presence;
create policy cc_presence_self on public.cc_presence for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

grant select,insert,update on public.cc_teams to authenticated;
grant select on public.cc_team_members to authenticated;
grant select,insert,update on public.cc_tournaments,public.cc_players,public.cc_presence to authenticated;
revoke all on public.admin_audit_logs,public.subscription_records,public.payment_transactions from anon,authenticated;

create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare u bigint:=0;t bigint:=0;tt bigint:=0;m bigint:=0;n bigint:=0;a bigint:=0;p bigint:=0;f bigint:=0;rev bigint:=0;ref bigint:=0;failed bigint:=0;online bigint:=0;
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 select count(*) into u from auth.users;
 select count(*) into n from auth.users where created_at>=now()-interval '30 days';
 select count(*) into a from auth.users where last_sign_in_at>=now()-interval '30 days';
 select count(*) into t from public.cc_teams; select count(*) into tt from public.cc_tournaments;
 if to_regclass('public.matches') is not null then execute 'select count(*) from public.matches' into m; end if;
 select count(distinct user_id) into p from public.subscription_records where plan_code<>'community_free' and status in ('trialing','active');
 select count(*) into f from auth.users x where not exists(select 1 from public.subscription_records s where s.user_id=x.id and s.plan_code<>'community_free' and s.status in ('trialing','active'));
 select coalesce(sum(amount_paise),0) into rev from public.payment_transactions where transaction_type='payment' and status='succeeded';
 select coalesce(sum(amount_paise),0) into ref from public.payment_transactions where transaction_type='refund' and status='succeeded';
 select count(*) into failed from public.payment_transactions where status='failed';
 select count(*) into online from public.cc_presence where last_seen_at>now()-interval '2 minutes';
 return jsonb_build_object('users',u,'teams',t,'tournaments',tt,'matches',m,'new_users_30d',n,'active_users_30d',a,
 'paid_subscribers',p,'free_users',f,'paid_conversion_pct',case when u=0 then 0 else round(p*100.0/u,1) end,
 'revenue_total',round(rev/100.0,2),'refund_total',round(ref/100.0,2),'failed_payments',failed,'online_now',online,'active_sessions',online);
end; $$;

create or replace function public.admin_list_users(_limit integer default 200)
returns table(user_id uuid,email text,full_name text,created_at timestamptz,last_sign_in_at timestamptz)
language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 return query select u.id,u.email::text,p.full_name,u.created_at,u.last_sign_in_at from auth.users u
 left join public.profiles p on p.id=u.id order by u.created_at desc limit greatest(1,least(coalesce(_limit,200),500));
end; $$;
create or replace function public.admin_recent_audit_logs(_limit integer default 50)
returns table(action text,created_at timestamptz,actor_email text,details jsonb)
language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 return query select l.action,l.created_at,u.email::text,l.details from public.admin_audit_logs l
 join auth.users u on u.id=l.actor_id order by l.created_at desc limit greatest(1,least(coalesce(_limit,50),100));
end; $$;
create or replace function public.admin_list_cc_teams(_limit integer default 200)
returns setof jsonb language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 return query select to_jsonb(x) from (select t.*,u.email owner_email from public.cc_teams t join auth.users u on u.id=t.owner_id order by t.created_at desc limit greatest(1,least(coalesce(_limit,200),500))) x;
end; $$;
create or replace function public.admin_list_cc_players(_limit integer default 300)
returns setof jsonb language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 return query select to_jsonb(x) from (select p.*,u.email creator_email from public.cc_players p join auth.users u on u.id=p.created_by order by p.created_at desc limit greatest(1,least(coalesce(_limit,300),500))) x;
end; $$;
create or replace function public.admin_list_cc_tournaments(_limit integer default 200)
returns setof jsonb language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 return query select to_jsonb(x) from (select t.*,u.email organizer_email from public.cc_tournaments t join auth.users u on u.id=t.organizer_id order by t.created_at desc limit greatest(1,least(coalesce(_limit,200),500))) x;
end; $$;
create or replace function public.admin_list_matches(_limit integer default 100)
returns setof jsonb language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 if to_regclass('public.matches') is null then return; end if;
 return query execute 'select to_jsonb(m) from public.matches m order by m.created_at desc limit $1' using greatest(1,least(coalesce(_limit,100),500));
end; $$;

revoke all on function public.admin_dashboard_stats() from public,anon;
revoke all on function public.admin_list_users(integer),public.admin_recent_audit_logs(integer),public.admin_list_cc_teams(integer),public.admin_list_cc_players(integer),public.admin_list_cc_tournaments(integer),public.admin_list_matches(integer) from public,anon;
grant execute on function public.admin_dashboard_stats(),public.admin_list_users(integer),public.admin_recent_audit_logs(integer),
public.admin_list_cc_teams(integer),public.admin_list_cc_players(integer),public.admin_list_cc_tournaments(integer),public.admin_list_matches(integer) to authenticated;
notify pgrst,'reload schema';
