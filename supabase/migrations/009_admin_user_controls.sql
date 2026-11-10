-- Crick Champs: account suspension state + admin user listing.
-- Run after the existing 001-008 migrations.
CREATE TABLE IF NOT EXISTS public.admin_user_controls (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended')),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_user_controls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_user_controls FROM anon, authenticated;

-- Preserve the existing RPC name and argument; expose status to the protected admin UI.
DROP FUNCTION IF EXISTS public.admin_list_users(INTEGER);
CREATE FUNCTION public.admin_list_users(_limit INTEGER DEFAULT 200)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  account_status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_role('super_admin') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::TEXT, p.full_name, u.created_at, u.last_sign_in_at,
         COALESCE(c.account_status, 'active')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.admin_user_controls c ON c.user_id = u.id
  ORDER BY u.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 200), 500));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_users(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(INTEGER) TO authenticated;
NOTIFY pgrst, 'reload schema';
