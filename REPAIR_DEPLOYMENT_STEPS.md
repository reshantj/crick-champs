# Crick Champs — repair deployment (read before uploading)

This is a static GitHub Pages website plus a Supabase backend. **GitHub Pages does not deploy Supabase SQL or Edge Functions.** Both must be deployed separately.

## 1. Back up
Create a Supabase backup before changing the database. Do not delete the project or tables.

## 2. Run the database migrations
In Supabase → SQL Editor, run these files one at a time, in this order:
1. `supabase/migrations/013_integrated_scoring_repair.sql`
2. `supabase/migrations/014_signup_and_admin_controls.sql`
3. `supabase/migrations/015_admin_delete_dependencies.sql`
4. `supabase/migrations/016_preserve_history_on_account_delete.sql`

Do not rerun older migrations 001–012 if they have already been applied. If 013–015 were already run successfully, run only 016.

## 3. Enable registration in Supabase
Supabase → Authentication → Sign In / Providers → Email:
- Enable Email provider.
- Enable **Allow new users to sign up**.
- Set email confirmation according to your preference.

Supabase → Authentication → URL Configuration:
- Site URL: `https://reshantj.github.io/crick-champs/`
- Add that same URL to Redirect URLs.

The website already contains a sign-up flow. If Supabase sign-ups are disabled, registration will fail regardless of GitHub deployment.

## 4. Deploy the two Edge Functions (required for Force Stop / Restore / Delete)
These are terminal commands, **not SQL**. Run them in Windows PowerShell after installing the Supabase CLI and extracting this ZIP:

```powershell
npm install -g supabase
supabase login
supabase link --project-ref bgafsvpgijqywjoiersq
supabase functions deploy admin-user-control
supabase functions deploy admin-delete-user
```

When prompted to link, select the existing `crick-champs-dev` project. Do not paste these commands into Supabase SQL Editor.

The functions use the Supabase-managed `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` environment variables. Never add the service-role key to HTML/JavaScript or GitHub.

After deployment, confirm both function names appear under Supabase → Edge Functions. Keep JWT verification enabled.

### Account-action behaviour
- Force Stop applies a long auth ban; new sign-ins are blocked. Existing JWTs may remain valid until expiry.
- Restore Access removes the ban.
- Delete Account removes the user's own Crick Champs-owned operational records, then deletes their Auth account. Legacy records, payments and audit history are retained with the deleted user's creator/actor reference set to NULL.
- The primary Super Admin `reshantj@gmail.com` is protected.
- Test using a disposable user first. Do not test by deleting your Super Admin.

## 5. Upload the website
Upload the **contents** of the `crick-champs-main` folder to the root of `reshantj/crick-champs`, including `.github/workflows/deploy.yml`. Commit to `main`, wait for GitHub Actions to succeed, then hard-refresh with Ctrl+F5.

## 6. Scoreboard verification
Open a public match using its watch link in a private/incognito window. The public match must have `is_public=true`. The watch page reads `cc_live_deliveries` and groups rows by `innings_no`, then calculates batting and bowling figures from each saved delivery.

The scorer must save each delivery with `innings_no`, `striker`, `bowler`, `bat_runs`, `extra_runs`, `total_runs`, `wicket`, `dismissed_batter` and `wicket_type`. Historical rows that were saved before `innings_no` existed default to innings 1; second-innings history cannot be inferred automatically.

## 7. What this ZIP does not prove
A successful ZIP build or GitHub Pages deployment does not prove the live Supabase project is configured correctly. Verify registration, Edge Function deployment, RLS/public read access and real scoring using disposable test data.
