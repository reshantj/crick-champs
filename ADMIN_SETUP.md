# Crick Champs Super Admin setup

1. In Supabase SQL Editor, run `supabase/migrations/003_full_admin_foundation.sql` as project owner.
2. Deploy the repository contents from this ZIP to GitHub Pages.
3. Sign in to the website with the Super Admin account and open `/admin/`.

## Pages included
Overview, Users, Subscribers & Plans, Scoreboards & Matches, Teams & Players, Tournaments, Payments & Refunds, Activity & Audit, Platform Health.

## Important implementation boundaries
- Overview and user list read current Supabase records through Super Admin-only RPCs.
- Match list/detail RPCs return the existing `public.matches` rows as JSON. This does not create ball-by-ball data if the app does not store it yet.
- Subscription and payment ledger tables are foundations; real counts/revenue require trusted payment-provider webhooks or server-side integration.
- Live visitor count is deliberately shown as not configured until heartbeat/presence tracking is added.
- Teams, players, tournaments, destructive account actions, refunds and feature controls are not enabled as browser-side shortcuts. They require schema-specific server-side functions, role checks and audit logging.
- Permanent deletion must be a confirmed, audited operation. Prefer archive/soft-delete for records referenced by historical matches.
- Do not place Supabase service-role keys in website JavaScript.


## Admin visual theme update
The Super Admin interface uses a charcoal/black workspace with orange navigation and accent cards, matching the supplied visual direction while retaining Crick Champs branding and navigation.


## Main website Admin Dashboard link
The main website now checks the signed-in user's `has_role('super_admin')` permission. Only when Supabase confirms that role does it display an **Admin Dashboard** link beside Log out. The link points to the site's `/admin/` route. The admin page independently verifies the role again; hiding the link is not treated as security.
