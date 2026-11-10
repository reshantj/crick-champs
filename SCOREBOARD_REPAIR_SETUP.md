# Public live scoreboard repair

1. Run `supabase/migrations/012_public_scoreboard_realtime.sql` in Supabase SQL Editor.
2. Deploy the full website files to GitHub Pages.
3. Ensure RLS SELECT policies allow anonymous (`anon`) reads of `cc_live_matches` where `is_public = true` and related `cc_live_deliveries` for those public matches. Do not make all private match data public.
4. New deliveries must include `innings_no` (migration 010 from this package chain).
5. Open the public spectator link `/watch/?id=<match UUID>`.

The public scoreboard now fetches the match and its deliveries, displays first and second innings separately, calculates batting and bowling summaries from stored deliveries, shows fall-of-wickets entries, and subscribes to changes for automatic refresh.

Limitations: older deliveries without `innings_no` are treated as innings 1. Batter/bowler figures depend on delivery rows having striker, bowler, bat_runs, extra_runs, total_runs, wicket and dismissed_batter populated. Maidens and dismissal-specific text are not inferred if the source data does not contain enough detail.
