# Link saved teams, players and tournaments to live matches

Run `supabase/migrations/011_match_roster_links.sql` in Supabase SQL Editor, then deploy the website.

The Create Live Match form now loads teams and tournaments owned by the signed-in user, and players from the selected teams (plus unassigned players). Team names and player names are selected from saved records rather than retyped. The match stores team IDs and optional tournament ID as well as display names.

Note: this package expects the existing RLS policies to allow owners to SELECT their own `cc_teams`, `cc_players`, and `cc_tournaments` rows.
