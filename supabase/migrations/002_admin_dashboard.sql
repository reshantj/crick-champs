-- Crick Champs Admin Dashboard (read-only first release)
-- Run in Supabase SQL Editor as project owner.

create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (char_length(action) between 1 and 100),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon, authenticated;

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_users bigint := 0;
  v_teams bigint := 0;
  v_tournaments bigint := 0;
  v_matches bigint := 0;
begin
  if not public.has_role('super_admin') then
    raise exception 'Not authorized';
  end if;
  select count(*) into v_users from auth.users;
  if to_regclass('public.teams') is not null then execute 'select count(*) from public.teams' into v_teams; end if;
  if to_regclass('public.tournaments') is not null then execute 'select count(*) from public.tournaments' into v_tournaments; end if;
  if to_regclass('public.matches') is not null then execute 'select count(*) from public.matches' into v_matches; end if;
  return jsonb_build_object('users',v_users,'teams',v_teams,'tournaments',v_tournaments,'matches',v_matches);
end;
$$;

create or replace function public.admin_list_users(_limit integer default 25)
returns table(user_id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
  return query
    select u.id, u.email::text, p.full_name, u.created_at, u.last_sign_in_at
    from auth.users u
    left join public.profiles p on p.id = u.id
    order by u.created_at desc
    limit greatest(1, least(coalesce(_limit,25),100));
end;
$$;

create or replace function public.admin_write_audit_log(_action text, _details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
  insert into public.admin_audit_logs(actor_id,action,details)
  values(auth.uid(), left(coalesce(_action,'admin_action'),100), coalesce(_details,'{}'::jsonb));
end;
$$;

create or replace function public.admin_recent_audit_logs(_limit integer default 10)
returns table(action text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
  return query select l.action,l.created_at from public.admin_audit_logs l
    order by l.created_at desc limit greatest(1, least(coalesce(_limit,10),50));
end;
$$;

revoke all on function public.admin_dashboard_stats() from public, anon;
revoke all on function public.admin_list_users(integer) from public, anon;
revoke all on function public.admin_write_audit_log(text,jsonb) from public, anon;
revoke all on function public.admin_recent_audit_logs(integer) from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_list_users(integer) to authenticated;
grant execute on function public.admin_write_audit_log(text,jsonb) to authenticated;
grant execute on function public.admin_recent_audit_logs(integer) to authenticated;
