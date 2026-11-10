# Crick Champs database repair

1. Open Supabase → SQL Editor → New query.
2. Paste the complete `supabase/migrations/005_repair_core.sql` file.
3. Run once as project owner and confirm Success.
4. Deploy the files in this release to GitHub Pages.
5. Test with a normal second account.

This additive migration creates missing `cc_teams`, `cc_tournaments`, `cc_players`, and online-presence tables, plus the admin RPCs. It preserves existing records. It does not create fake subscription/payment activity. Live online counts require the new frontend heartbeat and only count users whose heartbeat is less than two minutes old.
If the SQL returns an error, stop and share the first error; do not rerun migrations 001–004 blindly.


## Live scoring (migration 006)

After the core repair, run `supabase/migrations/006_live_scoring.sql` in SQL Editor.
Then in Supabase → Database → Publications, enable Realtime for `cc_live_matches` and `cc_live_deliveries`.
Deploy the website. A signed-in user opens Dashboard → Live scoring, creates a match, and shares the public watch URL. Spectators can open that URL without an account.
Scoring v1 supports dot, 1/2/3, four, six, wide, no-ball, bye, leg-bye, wicket, manual end swap, innings switch and undo. Only one scorer should enter balls for a match at a time. After a wicket, enter the incoming batter and check the striker/non-striker fields. Complex cricket laws (retired hurt, run-outs with crossed batters, penalty runs, DLS, super overs and full bowling/batting scorecards) are not yet implemented.


## Public scoreboard presentation update
The spectator page is a read-only scoreboard summary. It intentionally does not display ball-by-ball commentary or win probability. Scoring deliveries remain stored for match administration and future scorecard calculations.
