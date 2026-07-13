-- Token separado para o link de cadastro (diferente do form_token usado nos exames)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cadastro_token UUID DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cadastro_token
  ON public.profiles(cadastro_token)
  WHERE cadastro_token IS NOT NULL;
