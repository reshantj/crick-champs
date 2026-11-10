-- Crick Champs integrated scoring repair. Additive only; existing records are retained.
BEGIN;
ALTER TABLE public.cc_live_matches
  ADD COLUMN IF NOT EXISTS initial_striker text,
  ADD COLUMN IF NOT EXISTS initial_non_striker text,
  ADD COLUMN IF NOT EXISTS initial_bowler text,
  ADD COLUMN IF NOT EXISTS team_a_id uuid REFERENCES public.cc_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_b_id uuid REFERENCES public.cc_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES public.cc_tournaments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_innings_team text,
  ADD COLUMN IF NOT EXISTS second_innings_team text;
ALTER TABLE public.cc_live_deliveries
  ADD COLUMN IF NOT EXISTS innings_no integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS dismissed_batter text,
  ADD COLUMN IF NOT EXISTS incoming_batter text,
  ADD COLUMN IF NOT EXISTS wicket_type text,
  ADD COLUMN IF NOT EXISTS state_after jsonb,
  ADD COLUMN IF NOT EXISTS batting_team text;
ALTER TABLE public.cc_live_deliveries DROP CONSTRAINT IF EXISTS cc_live_deliveries_innings_no_check;
ALTER TABLE public.cc_live_deliveries ADD CONSTRAINT cc_live_deliveries_innings_no_check CHECK (innings_no IN (1,2));
CREATE INDEX IF NOT EXISTS cc_live_deliveries_match_innings_sequence_idx ON public.cc_live_deliveries(match_id, innings_no, sequence_no);
UPDATE public.cc_live_matches SET first_innings_team=COALESCE(first_innings_team, CASE WHEN innings=1 THEN batting_team ELSE bowling_team END);
UPDATE public.cc_live_matches SET second_innings_team=COALESCE(second_innings_team, CASE WHEN innings=2 THEN batting_team ELSE NULL END);
UPDATE public.cc_live_matches SET initial_striker=COALESCE(initial_striker,striker), initial_non_striker=COALESCE(initial_non_striker,non_striker), initial_bowler=COALESCE(initial_bowler,bowler);
UPDATE public.cc_live_deliveries d SET batting_team=m.first_innings_team FROM public.cc_live_matches m WHERE d.match_id=m.id AND d.innings_no=1 AND d.batting_team IS NULL;
ALTER TABLE public.cc_live_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_live_deliveries ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.cc_live_matches, public.cc_live_deliveries TO anon, authenticated;
GRANT INSERT, UPDATE ON public.cc_live_matches TO authenticated;
GRANT INSERT, DELETE ON public.cc_live_deliveries TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
