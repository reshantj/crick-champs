-- Enable realtime updates for public spectator scoreboard.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cc_live_matches;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cc_live_deliveries;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
