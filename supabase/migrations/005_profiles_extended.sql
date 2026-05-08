-- ============================================================
-- Migration 005 — Perfil estendido do paciente + campos de acompanhamento
-- Execute no SQL Editor do projeto Supabase
-- ============================================================

ALTER TABLE public.profiles
  -- Campos preenchidos pelo paciente (substituem Google Forms)
  ADD COLUMN IF NOT EXISTS data_nascimento  DATE,
  ADD COLUMN IF NOT EXISTS sexo             TEXT CHECK (sexo IN ('M', 'F')),
  ADD COLUMN IF NOT EXISTS como_conheceu    TEXT,
  ADD COLUMN IF NOT EXISTS cep              TEXT,
  ADD COLUMN IF NOT EXISTS endereco         TEXT,
  ADD COLUMN IF NOT EXISTS cidade_estado    TEXT,
  ADD COLUMN IF NOT EXISTS nome_mae         TEXT,
  ADD COLUMN IF NOT EXISTS profissao        TEXT,
  ADD COLUMN IF NOT EXISTS cns              TEXT,
  ADD COLUMN IF NOT EXISTS perfil_completo  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Campos preenchidos pela secretaria/médico (substituem a planilha)
  ADD COLUMN IF NOT EXISTS clinica          TEXT DEFAULT 'MedRenal',
  ADD COLUMN IF NOT EXISTS diagnostico      TEXT,
  ADD COLUMN IF NOT EXISTS status_paciente  TEXT NOT NULL DEFAULT 'ativo'
                                            CHECK (status_paciente IN ('ativo', 'inativo', 'obito')),
  ADD COLUMN IF NOT EXISTS obs_secretaria   TEXT;

-- Permite que paciente atualize o próprio perfil
DROP POLICY IF EXISTS "Paciente atualiza próprio perfil" ON public.profiles;
CREATE POLICY "Paciente atualiza próprio perfil"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
