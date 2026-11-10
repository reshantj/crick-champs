# Two-innings scoreboard update

1. Run `supabase/migrations/010_delivery_innings_no.sql` in Supabase SQL Editor.
2. Deploy the updated website files.
3. New scorer deliveries already include `innings_no`; this migration adds the missing database column.
4. Admin Match Detail now displays separate first- and second-innings sections, calculated from saved deliveries.

**Historical data limitation:** Deliveries created before `innings_no` existed default to innings 1. If older matches contain multiple innings mixed together without an innings marker, the original innings split cannot be reconstructed reliably from those rows. Check old match records before relying on their historical split.
