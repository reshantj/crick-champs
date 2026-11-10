-- Crick Champs migration 007: Super Admin-only audited record deletion.
-- Keeps financial transactions and admin audit history immutable.
CREATE OR REPLACE FUNCTION public.admin_delete_record(_table TEXT, _id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows INTEGER;
  v_label TEXT;
BEGIN
  IF NOT public.has_role('super_admin') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF _id IS NULL THEN
    RAISE EXCEPTION 'Record id is required';
  END IF;

  IF _table NOT IN ('cc_live_matches','cc_teams','cc_players','cc_tournaments','profiles') THEN
    RAISE EXCEPTION 'Deletion is not enabled for this record type';
  END IF;

  EXECUTE format('DELETE FROM public.%I WHERE id = $1', _table) USING _id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('deleted', false, 'table', _table, 'id', _id, 'message', 'Record not found');
  END IF;

  v_label := CASE _table
    WHEN 'cc_live_matches' THEN 'match'
    WHEN 'cc_teams' THEN 'team'
    WHEN 'cc_players' THEN 'player'
    WHEN 'cc_tournaments' THEN 'tournament'
    WHEN 'profiles' THEN 'profile'
  END;

  INSERT INTO public.admin_audit_logs(actor_id, action, details)
  VALUES ((SELECT auth.uid()), 'record_deleted',
    jsonb_build_object('record_type', v_label, 'table', _table, 'record_id', _id));

  RETURN jsonb_build_object('deleted', true, 'table', _table, 'id', _id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_record(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_record(TEXT, UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
