ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS website text;

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_creator(auth.uid()));

CREATE TABLE public.gemini_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  api_key text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  last_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id, label, active, position, last_used_at, last_error, created_at) ON public.gemini_api_keys TO authenticated;
GRANT INSERT (label, api_key, active, position, created_by), UPDATE (label, active, position), DELETE ON public.gemini_api_keys TO authenticated;
GRANT ALL ON public.gemini_api_keys TO service_role;
ALTER TABLE public.gemini_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read keys" ON public.gemini_api_keys FOR SELECT TO authenticated USING (public.is_creator(auth.uid()));
CREATE POLICY "Admins add keys" ON public.gemini_api_keys FOR INSERT TO authenticated WITH CHECK (public.is_creator(auth.uid()));
CREATE POLICY "Admins update keys" ON public.gemini_api_keys FOR UPDATE TO authenticated USING (public.is_creator(auth.uid()));
CREATE POLICY "Admins delete keys" ON public.gemini_api_keys FOR DELETE TO authenticated USING (public.is_creator(auth.uid()));

CREATE POLICY "Avatar public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatar own upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatar own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);