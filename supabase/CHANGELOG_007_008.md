# Crick Champs updates 007–008

Run these migrations in Supabase SQL Editor, in this order, after the existing core and live-scoring migrations:

1. `007_admin_delete_records.sql` — installs `admin_delete_record`. Only authenticated users with the `super_admin` role can delete allowed business records. Deletions are written to `admin_audit_logs`. Allowed types: matches, teams, players, tournaments and profiles. Financial transactions, payment records, user-role records and audit history are intentionally not deletable through this function. Deleting a match cascades its ball deliveries; deleting a team detaches players because of the existing FK.
2. `008_scoring_resume_undo.sql` — adds initial batter/bowler snapshots, per-delivery state snapshots and innings numbers for match resume and undo.

## Registration lock

The website UI now exposes one Login button and no public sign-up flow. To block direct API sign-ups too, open Supabase Dashboard → Authentication → Settings (or User Signups) and switch **Allow new users to sign up** OFF. Existing users can still log in. Create future accounts through Supabase Dashboard → Authentication → Users → Add user / Invite user. Do not expose a service-role key in the website.

## Scoring rotation rule implemented

Crick Champs custom rule: 1 and 3 completed runs swap the striker; 2 and 5 completed runs do not; 4 and 6 boundary results do not. At the end of a completed over (six legal balls), ends swap separately. Wide/no-ball deliveries do not count as legal balls. Completed runs on wides are derived from total wides minus the one-run penalty.

## Persistence and recovery

Match headers and deliveries are stored in Supabase. The scorer now lists saved matches owned by the signed-in user and can reopen them. Each accepted delivery is inserted in `cc_live_deliveries` and the match summary is updated in `cc_live_matches`. A match marked completed remains stored. This is persistent database storage, not browser local storage.

## Important limits

The browser app does not delete Auth users. Deleting an auth user requires a trusted server-side Admin API/Edge Function. Also, only one scorer should score a given match at a time; simultaneous scoring from multiple browsers is not concurrency-safe in this release.
