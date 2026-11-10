# Crick Champs — Supabase authentication integration

## What changed
- Replaced the demo-only sign-up/login submit handler with Supabase Auth.
- Added email/password registration, email confirmation, password login, password reset, and logout.
- Preserved the existing plain HTML/CSS/JavaScript site and GitHub Pages workflow.
- Added a private `profiles` table migration with owner-only RLS policies.

## 1. Supabase dashboard settings
In Authentication → Sign In / Providers:
- Email provider: enabled
- Allow new users to sign up: enabled while accepting registrations
- Confirm email: enabled
- Anonymous sign-ins: disabled

In Authentication → URL Configuration:
- Site URL: `https://reshantj.github.io/crick-champs/`
- Redirect URL allow-list: `https://reshantj.github.io/crick-champs/**`
- For local testing, also add `http://localhost:8000/**`.

The existing default confirmation email link is sufficient for this first integration. Custom SMTP and OTP-template customization can be configured before public launch; Supabase's default email service has sending limits and is not a production mail-delivery solution.

## 2. Apply the profile migration
Open Supabase → SQL Editor → New query. Paste and run the contents of:
`supabase/migrations/001_profiles.sql`

The table contains only the signed-in user's profile name. RLS denies anonymous access and restricts authenticated access to the row whose ID matches `auth.uid()`.

## 3. Deploy
Upload the updated contents of this folder to the root of the `main` branch in the existing `crick-champs` GitHub repository. Keep `.github/workflows/deploy.yml` in place. GitHub Actions will deploy the static site.

## 4. Test before real users
1. Open the deployed site and create a test player account with an email you control.
2. Confirm the email using the link Supabase sends.
3. Log in with the same email/password.
4. Test password reset.
5. Log out and verify the session is cleared.
6. In Supabase Authentication → Users, confirm the test account appears.

## Security boundaries
- The Supabase publishable key is intentionally used in the browser. It is not a secret; RLS is the security boundary.
- Never place a Supabase secret/service_role key, database password, SMTP password, or payment secret in browser code or GitHub.
- This first integration does **not** create administrator accounts or grant admin privileges. Do not add an `is_admin` field to public sign-up or trust user-editable metadata for authorization.
- Admin provisioning and mandatory MFA enforcement must be implemented through trusted server-side controls before enabling admin operations.
- This is an initial authentication integration, not a complete production security review. Test the RLS policies and configure production email delivery before inviting the public.
