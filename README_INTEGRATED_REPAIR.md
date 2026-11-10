# Crick Champs — integrated repair package

This release includes the static website, SQL migrations, and Supabase Edge Function source. Read `INTEGRATED_RELEASE_SETUP.md` before publishing.

## Critical deployment order

1. Back up Supabase.
2. Run SQL migrations 013, 014, 015 in order.
3. Enable Email sign-up and configure GitHub Pages redirect URLs in Supabase Auth.
4. Deploy both Edge Functions using Supabase CLI.
5. Replace the GitHub repository root with the contents of this folder and wait for Pages deployment.
6. Test with disposable users and matches before live use.

## Custom run rotation implemented

The scorer swaps ends once for run-button outcomes 1, 2 and 3; it does not swap for 0, 4, 5 or 6. The legal sixth ball causes a separate end-of-over swap. Byes and leg-byes use odd/even completed-run rotation. Wide/no-ball extras do not automatically rotate in this implementation.

## Security

The browser uses only the Supabase publishable key. The service-role key is read only by Supabase Edge Functions from project secrets. Registration does not create admin roles. Admin RPCs and account functions check `has_role('super_admin')` server-side.
