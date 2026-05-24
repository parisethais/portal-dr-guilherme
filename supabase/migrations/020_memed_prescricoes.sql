-- ============================================================
-- Migration 020 — Tabela memed_prescricoes
-- Persiste cada prescrição emitida/excluída via Memed Sinapse
-- Execute no SQL Editor do projeto Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.memed_prescricoes (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            TEXT        NOT NULL DEFAULT 'dr_guilherme',
  medico_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id           TEXT        NOT NULL,   -- idExterno Memed = profiles.id do paciente
  consulta_id          UUID        REFERENCES public.consultas(id) ON DELETE SET NULL,

  -- Identificadores Memed
  memed_prescricao_id  TEXT        NOT NULL UNIQUE,  -- prescricao.id (string numérica da Memed)
  prescricao_uuid      TEXT,                          -- prescricao.prescriptionUuid

  -- Dados da prescrição
  data_prescricao      TEXT,                          -- prescricao.data (string da Memed)
  reimpressao          BOOLEAN     NOT NULL DEFAULT false,
  alterada             BOOLEAN     NOT NULL DEFAULT false,
  medicamentos_json    TEXT        NOT NULL DEFAULT '[]',
  documents_json       TEXT        NOT NULL DEFAULT '[]',

  -- Soft delete (evento prescricaoExcluida)
  excluida             BOOLEAN     NOT NULL DEFAULT false,
  excluida_at          TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de busca mais comuns
CREATE INDEX IF NOT EXISTS memed_prescricoes_tenant_idx    ON public.memed_prescricoes (tenant_id);
CREATE INDEX IF NOT EXISTS memed_prescricoes_medico_idx    ON public.memed_prescricoes (medico_id);
CREATE INDEX IF NOT EXISTS memed_prescricoes_patient_idx   ON public.memed_prescricoes (patient_id);
CREATE INDEX IF NOT EXISTS memed_prescricoes_consulta_idx  ON public.memed_prescricoes (consulta_id);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS memed_prescricoes_updated_at ON public.memed_prescricoes;
CREATE TRIGGER memed_prescricoes_updated_at
  BEFORE UPDATE ON public.memed_prescricoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: médico vê apenas suas prescrições do seu tenant
ALTER TABLE public.memed_prescricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medico_own_tenant" ON public.memed_prescricoes
  FOR ALL
  USING (
    tenant_id = (
      SELECT c.tenant_id
      FROM   public.clinic_members cm
      JOIN   public.clinics c ON c.id = cm.clinic_id
      WHERE  cm.user_id = auth.uid()
      LIMIT  1
    )
  );
