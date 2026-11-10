# Integrated repair release

- Added a visible login/register switch and Supabase sign-up flow; signup metadata creates a basic profile and does not assign privileged roles.
- Added innings-aware delivery fields, batter dismissal/incoming batter fields, wicket type, saved post-delivery state and batting-team identity.
- Reworked scorer inserts to use the actual delivery schema plus the migration fields; removed duplicate dismissal selector ID.
- Implemented the requested custom 1/2/3-run rotation rule, non-rotation for 0/4/5/6, legal-ball over rotation, wicket batter replacement and separate second innings setup.
- Improved undo reconstruction from saved state and innings-specific deliveries.
- Reworked public scoreboard innings summaries, batting/bowling figures, extras, fall of wickets and periodic refresh.
- Added additive SQL migrations and deployment instructions for Supabase Edge Functions.
- Improved admin deletion dependency handling and clarified that Force Stop blocks new sign-ins while existing JWTs may remain valid until expiry.
