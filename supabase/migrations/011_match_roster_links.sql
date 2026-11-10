-- Link live matches to saved teams and tournaments
BEGIN;
ALTER TABLE public.cc_live_matches
  ADD COLUMN IF NOT EXISTS team_a_id UUID REFERENCES public.cc_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_b_id UUID REFERENCES public.cc_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.cc_tournaments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS cc_live_matches_tournament_idx ON public.cc_live_matches(tournament_id);
NOTIFY pgrst, 'reload schema';
COMMIT;
