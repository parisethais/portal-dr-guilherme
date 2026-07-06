-- Migration 036 — Tabela de biópsias
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.biopsia_results (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id      UUID        NOT NULL,
  tipo           TEXT        NOT NULL,
  data_realizado DATE        NOT NULL,
  laudo_resumido TEXT,
  file_url       TEXT,
  file_name      TEXT,
  extra_files    JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biopsia_patient_id ON public.biopsia_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_biopsia_tenant_id  ON public.biopsia_results(tenant_id);

ALTER TABLE public.biopsia_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medico_full_biopsia_results"
  ON public.biopsia_results FOR ALL
  USING     (get_my_role() = 'medico')
  WITH CHECK (get_my_role() = 'medico');

CREATE POLICY "paciente_read_own_biopsia_results"
  ON public.biopsia_results FOR SELECT
  USING (patient_id = auth.uid() AND get_my_role() = 'paciente');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biopsia_results TO authenticated;
