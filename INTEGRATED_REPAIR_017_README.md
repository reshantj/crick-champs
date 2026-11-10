# Crick Champs integrated repair patch (migration 017)

This patch is based on the uploaded `crick-champs-main(5).zip`.

## What changed
- Added `supabase/migrations/017_integrated_schema_and_account_delete.sql`.
- Updated `supabase/functions/admin-delete-user/index.ts` to perform FK-safe database cleanup through a restricted `SECURITY DEFINER` RPC before deleting the Auth user.
- The migration reconciles the match-creation fields used by `scorer/scorer.js`, the innings/scorecard fields used by `watch/watch.js`, and grants the Edge Function service role access to the relevant tables.
- It creates `admin_prepare_user_deletion(uuid,uuid)` so the delete function no longer attempts direct REST DELETE operations on every table.

## Apply in this order

1. Back up the Supabase database first.
2. In Supabase Dashboard → SQL Editor, run the full contents of:
   `supabase/migrations/017_integrated_schema_and_account_delete.sql`
3. Confirm the query reports success.
4. In GitHub, replace this file:
   `supabase/functions/admin-delete-user/index.ts`
   with the updated file from this package.
5. Commit to `main`. The existing GitHub Actions workflow should deploy the Edge Functions.
6. Confirm the GitHub Actions run is green.
7. Hard-refresh the website (`Ctrl+Shift+R`).

## Test order
1. Create a test match.
2. Open its public watch link and verify innings/scorecard rendering.
3. Force Stop a disposable test account and verify it cannot sign in.
4. Restore that account.
5. Delete a different disposable test account.

Never test deletion with the primary Super Admin account. Never put the Supabase service-role key in browser code or GitHub repository files; it belongs only in Supabase Edge Function secrets.

## Important limits
This patch addresses the exact schema fields and function failure patterns identified in the uploaded source and screenshots. It does not prove the production project has every earlier migration applied, nor does a successful GitHub deployment prove runtime correctness. If the SQL migration reports an error, stop and share the exact error before continuing.
