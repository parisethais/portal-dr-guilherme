-- Adiciona campos de antecedentes ao perfil do paciente
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS antecedentes_cirurgicos TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_familiares TEXT;
