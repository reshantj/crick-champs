-- CRICK CHAMPS: READ-ONLY DATABASE AUDIT
-- Run this BEFORE applying further migrations. It does not modify data.

-- 1. Actual delivery columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='cc_live_deliveries'
ORDER BY ordinal_position;

-- 2. Actual match columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='cc_live_matches'
ORDER BY ordinal_position;

-- 3. Recent matches and number of saved deliveries
SELECT m.id AS match_id, m.match_title, m.team_a, m.team_b,
       m.runs, m.wickets, m.legal_balls, m.innings,
       COUNT(d.id) AS delivery_count
FROM public.cc_live_matches m
LEFT JOIN public.cc_live_deliveries d ON d.match_id=m.id
GROUP BY m.id
ORDER BY m.created_at DESC
LIMIT 50;

-- 4. Full saved delivery payloads for Red Devil matches
SELECT m.match_title, to_jsonb(d) AS delivery_record
FROM public.cc_live_matches m
JOIN public.cc_live_deliveries d ON d.match_id=m.id
WHERE m.team_a ILIKE '%Red Devil%'
   OR m.team_b ILIKE '%Red Devil%'
   OR m.match_title ILIKE '%Red Devil%'
ORDER BY m.created_at DESC;
