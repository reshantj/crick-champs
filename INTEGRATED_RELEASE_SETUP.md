# Crick Champs integrated release — deployment checklist

This package updates the static website, database migrations and Supabase Edge Functions. GitHub Pages only hosts the static website; it does not deploy SQL migrations or Edge Functions.

## A. Back up first

1. In Supabase, create a database backup/export before applying migrations.
2. Do not delete existing tables or old match data.
3. Keep the existing Super Admin role row for `reshantj@gmail.com`.

## B. Apply SQL migrations

Open Supabase → SQL Editor. Run these files in order, one at a time:

1. `supabase/migrations/013_integrated_scoring_repair.sql`
2. `supabase/migrations/014_signup_and_admin_controls.sql`
3. `supabase/migrations/015_admin_delete_dependencies.sql`

The earlier migration `010_delivery_innings_no.sql` may already have been run; migration 013 is additive and uses `IF NOT EXISTS` for the columns it introduces.

## C. Enable registration

Supabase → Authentication → Sign In / Providers → Email:
- Enable new user sign-ups.
- Keep email confirmation enabled if you want verified email addresses.

Authentication → URL Configuration:
- Add the exact GitHub Pages site URL to Site URL / Redirect URLs. For this repository that is normally `https://reshantj.github.io/crick-champs/`.

Registration creates an ordinary authenticated account. It does not grant `super_admin`.

## D. Deploy the Edge Functions

Install Supabase CLI and run these commands from the extracted repository root:

```bash
supabase login
supabase link --project-ref bgafsvpgijqywjoiersq
supabase functions deploy admin-user-control
supabase functions deploy admin-delete-user
```

The functions use Supabase's project environment variables, including `SUPABASE_SERVICE_ROLE_KEY`. Never put the service-role key in website JavaScript or GitHub Pages files.

`Force Stop` blocks new sign-ins by banning the account. Existing JWT sessions may remain valid until token expiry; do not treat this as instantaneous session revocation. `Restore Access` removes the ban. Account deletion removes the user's Crick Champs operational records before deleting the Auth account. Deletion can still be blocked by protected financial/history references; that is intentional.

## E. Publish the website

1. Extract this ZIP.
2. Open the `crick-champs-main` folder.
3. Upload the **contents** of that folder to the root of the GitHub repository (including `.github/workflows/deploy.yml`).
4. Commit to `main` and wait for the Pages workflow to succeed.
5. Hard-refresh the website (Ctrl+F5).

## F. Test using disposable data

1. Register a normal account; confirm it cannot open `/admin/`.
2. Log in as the existing Super Admin and check `/admin/`.
3. Create a team, attach players, create a tournament, and create a match using those saved records.
4. Score a test innings: 0, 1, 2, 3, 4, 5, 6; confirm the custom requested rotation rule in the scorer fields.
5. Score a wicket and select the dismissed batter, wicket type and incoming batter.
6. End innings 1, set the second innings opening batter/bowler names in the scorer fields, and start innings 2.
7. Open the public `watch` link in a private/incognito window. Confirm both innings and delivery updates.
8. Test Undo, Force Stop, Restore Access and Delete Account only on disposable test accounts/matches.

## Notes and known limits

- Existing historical deliveries are assigned `innings_no = 1` by default. If an old match already contains second-innings deliveries, their innings cannot be inferred reliably from the old rows; manually identify and correct those rows before relying on historical two-innings scorecards.
- The custom rule implemented here rotates once for the 1, 2 or 3 run scoring controls, and not for 0, 4, 5 or 6. A legal sixth ball also triggers the separate end-of-over swap. Byes and leg-byes use odd/even completed-run rotation; wides and no-balls do not automatically rotate in this implementation.
- Public scoreboard visibility depends on the existing RLS policies and `is_public=true`.
- Test real database writes, permissions and match calculations after deployment. Static JavaScript syntax checks do not prove the live Supabase project is configured correctly.
