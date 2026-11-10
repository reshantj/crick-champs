# Crick Champs — GitHub-ready website

An original, responsive static website starter for Crick Champs. It is designed to deploy directly to **GitHub Pages** without a build step or paid hosting.

## Included

- Responsive homepage and navigation
- Match centre with Live / Upcoming / Completed filters
- Tournament, team and player showcase sections
- Membership/pricing preview
- Sign-up and login modal (demo UI only)
- Terms & Conditions, Privacy Policy, Paid Services, Cancellation & Refunds pages
- GitHub Actions workflow to deploy automatically from `main`

## Deploy to GitHub

1. Sign in to GitHub and create a **new empty repository** named `crick-champs` (or another name). Do not initialise it with a README if you plan to upload these files as-is.
2. Extract this ZIP on your computer.
3. Open the extracted `crick-champs-github` folder. You should see `index.html`, `styles.css`, `app.js`, `terms.html`, `privacy.html`, `paid-services.html`, `refund.html`, `assets/`, and `.github/`.
4. Upload the **contents** of this folder to the root of your GitHub repository (not the parent folder). Commit to the `main` branch.
5. In the repository, open **Settings → Pages**. Set the build/deployment source to **GitHub Actions**.
6. Open the **Actions** tab. Wait for “Deploy Crick Champs to GitHub Pages” to complete successfully.
7. Your site will be published at `https://YOUR-GITHUB-USERNAME.github.io/REPOSITORY-NAME/`.

Every new push to `main` will trigger another deployment.

## Run locally

No Node.js is required. Open `index.html` in a browser, or run a local static server from this folder, for example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Important: current release limitations

This is a **frontend preview**, not a production cricket platform. The match, tournament, team and player information is illustrative demo data. The login/signup form intentionally does not create accounts. There is no live scoring engine, database, user authentication, payment gateway, streaming, admin console or persistent data yet.

The next integration stage is Supabase PostgreSQL + Supabase Auth with row-level security (RLS), followed by a trusted backend for scoring, admin actions and payments. Do not add Supabase `service_role`/secret keys, database passwords or payment gateway secrets to this static website or to any `VITE_`/browser environment variable.

## Before accepting real users or payments

- Replace the draft legal pages with reviewed policies and the actual operator's legal name, address and grievance contact.
- Configure a real support email and domain.
- Implement and security-test authentication, database policies, user roles and account recovery.
- Confirm player/minor privacy and consent flows.
- Integrate a payment gateway server-side; disclose final prices, taxes, renewals, cancellation and refund terms before checkout.
- Replace all demo data and clearly label any remaining sample content.
- Test mobile layouts, accessibility, privacy and security before launch.

## Branding

The visual identity and copy in this starter are original Crick Champs concepts. This project is not affiliated with CricHeroes and does not include their proprietary code, assets or database.


## Realistic UI upgrade
The match cards now open a detailed match-centre panel and the homepage includes a sample league table. All fixtures, scores, player stats and standings are illustrative demo content. They are not live feeds and are not connected to a scoring engine. Authentication remains connected to the configured Supabase project; production match scoring, team/tournament CRUD and real stats require additional schema and secure workflows.

## November 2026 update: login, saved scoring and Super Admin delete controls

See `supabase/CHANGELOG_007_008.md`. Apply migrations `007_admin_delete_records.sql` and `008_scoring_resume_undo.sql` in Supabase SQL Editor before deploying this website update. The website now has one Login entry point, no public sign-up form, role-based redirection, saved-match reopening, delivery persistence, custom strike rotation (1/3 swap; 2/5/4/6 no swap; over-end swap), and Super Admin-only audited deletion for matches, teams, players, tournaments and profiles.


## 2026-11-09 scoring and access update

- Custom run rotation: simulate 1, 2 or 3 completed-run end changes; 0, 4, 5 and 6 do not rotate. Two completed-run changes end at the original ends.
- Wicket entry now requires the scorer to choose the dismissed batter and enter an incoming batter; the incoming player replaces the dismissed player at the end occupied after run/over rotation.
- Manual end correction remains available through the scorer's batter fields and Swap ends control.
- Supabase persistence and admin deletion rely on the included migrations and the configured Supabase project.

### Required Supabase settings

1. Apply migrations in order if not already applied. If the project already has migrations 001-008 applied, apply only the newly amended 008 statements (the two `ADD COLUMN IF NOT EXISTS` statements are safe to rerun).
2. In Supabase Authentication settings, disable **Allow new users to sign up** to block public self-registration.
3. Ensure only `reshantj@gmail.com` has the `super_admin` role. The website uses the `has_role('super_admin')` RPC for routing and the protected admin RPCs for data access.
4. Keep the Supabase publishable key in the client; never put a service-role key in this static website.

### Important limitations to validate before production

- This static site uses a single-scorer workflow; it does not implement multi-scorer locking/conflict resolution.
- Cricket extras and run-out edge cases require match-official validation; this release's custom rotation is intentionally non-standard.
- Supabase account creation is controlled by the dashboard setting, not by hiding a registration button alone.
