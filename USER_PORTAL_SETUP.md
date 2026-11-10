# Crick Champs User Portal and Homepage Upgrade

1. Run `supabase/migrations/004_user_portal.sql` in Supabase SQL Editor as project owner.
2. Deploy all files in this package to the GitHub repository root, preserving `.github/workflows/deploy.yml`.
3. Main-site sign-in and registration now redirect signed-in users to `/dashboard/`.
4. Signed-in users see a My Dashboard link. Super Admins additionally see Admin Dashboard.
5. User dashboard includes editable profile name/phone, team creation, tournament creation, and personal team/tournament lists.

## Important scope
- User IDs are Supabase-generated and cannot be edited by users.
- Users may create teams and tournaments; ownership is enforced by RLS.
- This migration uses separate `cc_teams` and `cc_tournaments` tables to avoid making assumptions about existing legacy tables.
- It does not yet implement team invitations, roster management, fixtures, live ball-by-ball scoring, player statistics, payments, or subscription checkout. Those require further database workflows and testing.
- The homepage uses a refreshed teal/green/lime palette intended to be welcoming and accessible.
