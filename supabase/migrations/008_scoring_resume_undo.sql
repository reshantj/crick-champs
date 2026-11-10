-- Persist initial batter state and post-delivery state for reliable resume/undo.
ALTER TABLE public.cc_live_matches
  ADD COLUMN IF NOT EXISTS initial_striker TEXT,
  ADD COLUMN IF NOT EXISTS initial_non_striker TEXT,
  ADD COLUMN IF NOT EXISTS initial_bowler TEXT;

ALTER TABLE public.cc_live_deliveries
  ADD COLUMN IF NOT EXISTS state_after JSONB,
  ADD COLUMN IF NOT EXISTS innings_no INTEGER NOT NULL DEFAULT 1;

-- Backfill initial state for existing matches where possible from first delivery.
UPDATE public.cc_live_matches m
SET initial_striker = COALESCE(m.initial_striker, (
      SELECT d.striker FROM public.cc_live_deliveries d
      WHERE d.match_id = m.id ORDER BY d.sequence_no ASC LIMIT 1
    ), m.striker),
    initial_non_striker = COALESCE(m.initial_non_striker, (
      SELECT d.non_striker FROM public.cc_live_deliveries d
      WHERE d.match_id = m.id ORDER BY d.sequence_no ASC LIMIT 1
    ), m.non_striker),
    initial_bowler = COALESCE(m.initial_bowler, (
      SELECT d.bowler FROM public.cc_live_deliveries d
      WHERE d.match_id = m.id ORDER BY d.sequence_no ASC LIMIT 1
    ), m.bowler)
WHERE m.initial_striker IS NULL
   OR m.initial_non_striker IS NULL
   OR m.initial_bowler IS NULL;

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.cc_live_deliveries ADD COLUMN IF NOT EXISTS dismissed_batter TEXT, ADD COLUMN IF NOT EXISTS incoming_batter TEXT;
NOTIFY pgrst, 'reload schema';
