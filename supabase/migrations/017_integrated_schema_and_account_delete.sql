-- Crick Champs migration 017: reconcile live-match schema and secure account deletion.
-- Additive and data-preserving. Run once in Supabase SQL Editor as project owner.

BEGIN;

-- Match creation payload used by scorer/scorer.js
ALTER TABLE public.cc_live_matches
  ADD COLUMN IF NOT EXISTS initial_striker text,
  ADD COLUMN IF NOT EXISTS initial_non_striker text,
  ADD COLUMN IF NOT EXISTS initial_bowler text,
  ADD COLUMN IF NOT EXISTS first_innings_team text,
  ADD COLUMN IF NOT EXISTS second_innings_team text,
  ADD COLUMN IF NOT EXISTS team_a_id uuid REFERENCES public.cc_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_b_id uuid REFERENCES public.cc_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES public.cc_tournaments(id) ON DELETE SET NULL;

-- Fields consumed by the public scorecard and innings-aware scoring code.
ALTER TABLE public.cc_live_deliveries
  ADD COLUMN IF NOT EXISTS innings_no integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS dismissed_batter text,
  ADD COLUMN IF NOT EXISTS incoming_batter text,
  ADD COLUMN IF NOT EXISTS wicket_type text,
  ADD COLUMN IF NOT EXISTS state_after jsonb,
  ADD COLUMN IF NOT EXISTS batting_team text;

ALTER TABLE public.cc_live_deliveries
  DROP CONSTRAINT IF EXISTS cc_live_deliveries_innings_no_check;
ALTER TABLE public.cc_live_deliveries
  ADD CONSTRAINT cc_live_deliveries_innings_no_check
  CHECK (innings_no IN (1,2));

CREATE INDEX IF NOT EXISTS cc_live_deliveries_match_innings_sequence_idx
  ON public.cc_live_deliveries(match_id, innings_no, sequence_no);

-- Ensure the account controls table exists for the Force Stop / Restore actions.
CREATE TABLE IF NOT EXISTS public.admin_user_controls (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active','suspended')),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_user_controls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_user_controls FROM anon, authenticated;

-- Browser scoring is still protected by RLS; service_role is for Edge Functions only.
GRANT SELECT ON public.cc_live_matches, public.cc_live_deliveries TO anon, authenticated;
GRANT INSERT, UPDATE ON public.cc_live_matches TO authenticated;
GRANT INSERT, DELETE ON public.cc_live_deliveries TO authenticated;
GRANT ALL PRIVILEGES ON public.cc_live_matches, public.cc_live_deliveries,
  public.cc_players, public.cc_teams, public.cc_team_members,
  public.cc_tournaments, public.cc_presence, public.profiles,
  public.user_roles, public.admin_user_controls, public.admin_audit_logs
TO service_role;

-- Execute the operational-record cleanup as a database-owner function rather than
-- relying on PostgREST table DELETE grants from the Edge Function.
CREATE OR REPLACE FUNCTION public.admin_prepare_user_deletion(
  _user_id uuid,
  _actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_team_ids uuid[];
BEGIN
  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;

  IF _user_id IS NULL OR _actor_id IS NULL OR _user_id = _actor_id THEN
    RAISE EXCEPTION 'Invalid target account';
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = _user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF v_email = 'reshantj@gmail.com' THEN
    RAISE EXCEPTION 'The primary Super Admin account is protected';
  END IF;

  -- Match deliveries are removed by the match FK's ON DELETE CASCADE.
  DELETE FROM public.cc_live_matches WHERE owner_id = _user_id;

  DELETE FROM public.cc_players WHERE created_by = _user_id;
  DELETE FROM public.cc_team_members WHERE user_id = _user_id;

  SELECT coalesce(array_agg(id), ARRAY[]::uuid[])
    INTO v_team_ids
    FROM public.cc_teams WHERE owner_id = _user_id;

  IF cardinality(v_team_ids) > 0 THEN
    DELETE FROM public.cc_team_members WHERE team_id = ANY(v_team_ids);
    UPDATE public.cc_players SET team_id = NULL WHERE team_id = ANY(v_team_ids);
    DELETE FROM public.cc_teams WHERE id = ANY(v_team_ids);
  END IF;

  DELETE FROM public.cc_tournaments WHERE organizer_id = _user_id;
  DELETE FROM public.cc_presence WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.admin_user_controls WHERE user_id = _user_id;

  RETURN jsonb_build_object('prepared', true, 'target_user_id', _user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_prepare_user_deletion(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_prepare_user_deletion(uuid,uuid)
  TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
