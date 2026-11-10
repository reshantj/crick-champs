# Crick Champs admin user actions and scoreboards

## Included in this update
- Registered Users now shows **Force Stop**, **Restore Access**, and **Delete Account** actions.
- Reshant's `reshantj@gmail.com` account is protected in the UI and in both Edge Functions.
- Match detail no longer prints raw JSON; it renders a readable match summary and saved delivery list.
- Existing match/team/player/tournament delete RPC remains in place.

## Required Supabase deployment
1. Run `supabase/migrations/009_admin_user_controls.sql` in the SQL Editor.
2. Deploy both Edge Functions from this repository:
   - `supabase/functions/admin-user-control`
   - `supabase/functions/admin-delete-user`
3. Ensure the Edge Functions have the platform-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` secrets. Never put the service-role key in browser JavaScript.
4. Ensure Edge Function JWT verification is enabled.

Example CLI commands from the repository root:

```bash
supabase functions deploy admin-user-control
supabase functions deploy admin-delete-user
```

## Behaviour and safety
- Force Stop applies a long auth ban, which revokes/blocks sessions and new logins until restored.
- Restore Access removes the auth ban.
- Delete Account calls the Supabase Auth Admin API. Foreign-key `RESTRICT` constraints can intentionally prevent deletion if the user still owns teams, matches, or financial records; transfer/archive those records before retrying.
- Audit records are written to `admin_audit_logs`.
- Do not delete the Super Admin account. It is protected by email and role checks.
- Deleting a user is not the same as deleting their cricket records. This package deliberately avoids silently cascading business data.

## Match detail limitation
The match detail screen displays fields available in `cc_live_matches` and `cc_live_deliveries`. Batting scorecards, bowling figures, partnerships and fall-of-wickets require those statistics to be stored in normalized scoring data; they are not fabricated from the summary row.
