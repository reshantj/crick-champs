-- Crick Champs expanded Super Admin foundation.
-- Run as project owner in Supabase SQL Editor. This is additive and does not hard-delete records.

create table if not exists public.admin_audit_logs (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id) on delete restrict,
 action text not null check(char_length(action) between 1 and 100),
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon, authenticated;

create table if not exists public.subscription_records (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 plan_code text not null check(plan_code in ('community_free','pro_player','tournament_manager')),
 status text not null check(status in ('trialing','active','past_due','cancelled','expired')),
 provider text, provider_subscription_id text unique,
 started_at timestamptz not null default now(), current_period_end timestamptz,
 created_at timestamptz not null default now()
);
alter table public.subscription_records enable row level security;
revoke all on public.subscription_records from anon, authenticated;

create table if not exists public.payment_transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 provider text not null, provider_transaction_id text not null unique,
 transaction_type text not null check(transaction_type in ('payment','refund')),
 amount_paise bigint not null check(amount_paise >= 0),
 currency text not null default 'INR',
 status text not null check(status in ('pending','succeeded','failed','refunded')),
 related_transaction_id uuid references public.payment_transactions(id),
 created_at timestamptz not null default now()
);
alter table public.payment_transactions enable row level security;
revoke all on public.payment_transactions from anon, authenticated;

create or replace function public.admin_write_audit_log(_action text,_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 insert into public.admin_audit_logs(actor_id,action,details) values(auth.uid(),left(coalesce(_action,'admin_action'),100),coalesce(_details,'{}'::jsonb));
end; $$;

create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare u bigint:=0;t bigint:=0;to_count bigint:=0;m bigint:=0;n bigint:=0;a bigint:=0;p bigint:=0;f bigint:=0;rev bigint:=0;ref bigint:=0;failed bigint:=0;
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 select count(*) into u from auth.users;
 select count(*) into n from auth.users where created_at>=now()-interval '30 days';
 select count(*) into a from auth.users where last_sign_in_at>=now()-interval '30 days';
 if to_regclass('public.teams') is not null then execute 'select count(*) from public.teams' into t; end if;
 if to_regclass('public.tournaments') is not null then execute 'select count(*) from public.tournaments' into to_count; end if;
 if to_regclass('public.matches') is not null then execute 'select count(*) from public.matches' into m; end if;
 select count(distinct user_id) into p from public.subscription_records where plan_code<>'community_free' and status in ('trialing','active');
 select count(*) into f from auth.users x where not exists(select 1 from public.subscription_records s where s.user_id=x.id and s.plan_code<>'community_free' and s.status in ('trialing','active'));
 select coalesce(sum(amount_paise),0) into rev from public.payment_transactions where transaction_type='payment' and status='succeeded';
 select coalesce(sum(amount_paise),0) into ref from public.payment_transactions where transaction_type='refund' and status='succeeded';
 select count(*) into failed from public.payment_transactions where status='failed';
 return jsonb_build_object('users',u,'teams',t,'tournaments',to_count,'matches',m,'new_users_30d',n,'active_users_30d',a,'paid_subscribers',p,'free_users',f,'paid_conversion_pct',case when u=0 then 0 else round(p*100.0/u,1) end,'revenue_total',round(rev/100.0,2),'refund_total',round(ref/100.0,2),'failed_payments',failed,'online_now',null,'active_sessions',null);
end; $$;

create or replace function public.admin_list_users(_limit integer default 100)
returns table(user_id uuid,email text,full_name text,created_at timestamptz,last_sign_in_at timestamptz)
language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 return query select u.id,u.email::text,p.full_name,u.created_at,u.last_sign_in_at from auth.users u left join public.profiles p on p.id=u.id order by u.created_at desc limit greatest(1,least(coalesce(_limit,100),500));
end; $$;

create or replace function public.admin_recent_audit_logs(_limit integer default 50)
returns table(action text,created_at timestamptz,actor_email text,details jsonb)
language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 return query select l.action,l.created_at,u.email::text,l.details from public.admin_audit_logs l join auth.users u on u.id=l.actor_id order by l.created_at desc limit greatest(1,least(coalesce(_limit,50),100));
end; $$;

-- Match list and detail expose existing match rows only; no assumed score schema.
create or replace function public.admin_list_matches(_limit integer default 100)
returns setof jsonb language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 if to_regclass('public.matches') is null then return; end if;
 return query execute 'select to_jsonb(m) from public.matches m order by m.created_at desc limit $1' using greatest(1,least(coalesce(_limit,100),500));
end; $$;

create or replace function public.admin_match_detail(_match_id text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v jsonb;
begin
 if not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 execute 'select to_jsonb(m) from public.matches m where m.id::text=$1' into v using _match_id;
 if v is null then raise exception 'Match not found'; end if;
 return v;
end; $$;

revoke all on function public.admin_dashboard_stats() from public,anon;
revoke all on function public.admin_list_users(integer) from public,anon;
revoke all on function public.admin_recent_audit_logs(integer) from public,anon;
revoke all on function public.admin_write_audit_log(text,jsonb) from public,anon;
revoke all on function public.admin_list_matches(integer) from public,anon;
revoke all on function public.admin_match_detail(text) from public,anon;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_list_users(integer) to authenticated;
grant execute on function public.admin_recent_audit_logs(integer) to authenticated;
grant execute on function public.admin_write_audit_log(text,jsonb) to authenticated;
grant execute on function public.admin_list_matches(integer) to authenticated;
grant execute on function public.admin_match_detail(text) to authenticated;
