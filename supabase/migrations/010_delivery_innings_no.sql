-- Crick Champs migration 010: persist innings number on every delivery
BEGIN;

ALTER TABLE public.cc_live_deliveries
ADD COLUMN IF NOT EXISTS innings_no INTEGER NOT NULL DEFAULT 1
CHECK (innings_no BETWEEN 1 AND 4);

CREATE INDEX IF NOT EXISTS cc_deliveries_match_innings_idx
ON public.cc_live_deliveries(match_id, innings_no, sequence_no);

NOTIFY pgrst, 'reload schema';
COMMIT;
