-- Registration profile bootstrap and account-control table. No public role assignment.
BEGIN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
CREATE OR REPLACE FUNCTION public.handle_new_crick_champs_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name, display_name, created_at, updated_at)
  VALUES (NEW.id,
          NULLIF(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), ''),
          NULLIF(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), ''),
          now(), now())
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_crick_champs ON auth.users;
CREATE TRIGGER on_auth_user_created_crick_champs
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_crick_champs_user();
CREATE TABLE IF NOT EXISTS public.admin_user_controls (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended')),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_user_controls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_user_controls FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
