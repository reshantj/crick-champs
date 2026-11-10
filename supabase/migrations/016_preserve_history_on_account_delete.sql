-- Migration 016: make account deletion compatible with retained audit and legacy history.
-- Keeps historical rows; removes only the deleted user's identity reference.
BEGIN;

DO $$
DECLARE
  r record;
  cname text;
  colname text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('admin_audit_logs','actor_id'),
      ('subscription_records','user_id'),
      ('payment_transactions','user_id'),
      ('matches','created_by'),
      ('teams','created_by'),
      ('tournaments','created_by')
    ) AS x(tbl,col)
  LOOP
    IF to_regclass(format('public.%I', r.tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=r.tbl AND column_name=r.col
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col);

    FOR cname IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=r.tbl
        AND c.contype='f' AND c.confrelid='auth.users'::regclass
        AND EXISTS (
          SELECT 1 FROM unnest(c.conkey) AS key(attnum)
          JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum
          WHERE a.attname=r.col
        )
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, cname);
    END LOOP;

    cname := 'fk_' || r.tbl || '_' || r.col || '_auth_users_set_null';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=r.tbl AND c.conname=cname
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE SET NULL',
        r.tbl, cname, r.col
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
