-- ============================================================
-- Migration 006 — Módulo de Prontuário
-- Dependência: get_my_role() já existe (migrations anteriores)
-- ============================================================

-- 1. Expandir consultas com campos de prontuário
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS diagnosticos TEXT,
  ADD COLUMN IF NOT EXISTS evolucao     TEXT,
  ADD COLUMN IF NOT EXISTS conduta      TEXT;

-- 2. Resultados laboratoriais
CREATE TABLE IF NOT EXISTS public.lab_results (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consulta_id  UUID        REFERENCES public.consultas(id) ON DELETE SET NULL,
  exam_name    TEXT        NOT NULL,
  value        TEXT        NOT NULL,
  unit         TEXT,
  collected_at DATE        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- garante upsert por paciente + exame + data
  CONSTRAINT lab_results_patient_exam_date_unique
    UNIQUE (patient_id, exam_name, collected_at)
);

CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id   ON public.lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_collected_at ON public.lab_results(collected_at DESC);

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medico_full_lab_results"
  ON public.lab_results FOR ALL
  USING     (get_my_role() = 'medico')
  WITH CHECK (get_my_role() = 'medico');

CREATE POLICY "paciente_read_own_lab_results"
  ON public.lab_results FOR SELECT
  USING (patient_id = auth.uid() AND get_my_role() = 'paciente');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_results TO authenticated;

-- 3. Exames de imagem estruturados
CREATE TABLE IF NOT EXISTS public.imaging_results (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo           TEXT        NOT NULL
                             CHECK (tipo IN ('usg_rins','eco','tc_torax','tc_abdomen','ecg','outro')),
  data_realizado DATE        NOT NULL,
  laudo_resumido TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imaging_patient_id ON public.imaging_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_imaging_tipo        ON public.imaging_results(tipo);

ALTER TABLE public.imaging_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medico_full_imaging_results"
  ON public.imaging_results FOR ALL
  USING     (get_my_role() = 'medico')
  WITH CHECK (get_my_role() = 'medico');

CREATE POLICY "paciente_read_own_imaging_results"
  ON public.imaging_results FOR SELECT
  USING (patient_id = auth.uid() AND get_my_role() = 'paciente');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.imaging_results TO authenticated;
