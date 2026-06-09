-- ══════════════════════════════════════════════════════════════════
-- Migration 027 — Proteger dados clínicos contra exclusão em cascata
-- Conformidade: CFM Res. 1.821/2007 (guarda mínima 20 anos)
--               LGPD Art. 46 (medidas técnicas de proteção)
-- ══════════════════════════════════════════════════════════════════
--
-- Antes: ON DELETE CASCADE → excluir paciente apagava prontuário completo
-- Depois: ON DELETE RESTRICT → impede exclusão do paciente se houver dados clínicos
--
-- Para "remover" um paciente, use status_paciente = 'inativo' no perfil.
-- Exclusão física só é possível se todos os dados clínicos forem removidos primeiro
-- (o que para prontuários finalizados viola a lei — portanto funciona como proteção).
-- ══════════════════════════════════════════════════════════════════

-- ── consultas ──────────────────────────────────────────────────
ALTER TABLE public.consultas
  DROP CONSTRAINT IF EXISTS consultas_patient_id_fkey;

ALTER TABLE public.consultas
  ADD CONSTRAINT consultas_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.profiles(id)
  ON DELETE RESTRICT;

-- ── lab_results ────────────────────────────────────────────────
ALTER TABLE public.lab_results
  DROP CONSTRAINT IF EXISTS lab_results_patient_id_fkey;

ALTER TABLE public.lab_results
  ADD CONSTRAINT lab_results_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.profiles(id)
  ON DELETE RESTRICT;

-- ── imaging_results ────────────────────────────────────────────
ALTER TABLE public.imaging_results
  DROP CONSTRAINT IF EXISTS imaging_results_patient_id_fkey;

ALTER TABLE public.imaging_results
  ADD CONSTRAINT imaging_results_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.profiles(id)
  ON DELETE RESTRICT;

-- ── prescricoes ────────────────────────────────────────────────
ALTER TABLE public.prescricoes
  DROP CONSTRAINT IF EXISTS prescricoes_patient_id_fkey;

ALTER TABLE public.prescricoes
  ADD CONSTRAINT prescricoes_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.profiles(id)
  ON DELETE RESTRICT;

-- ── Soft-delete: marca data de exclusão ao invés de apagar ─────
-- Garante que o perfil do paciente possa ser "desativado" sem excluir
-- os dados clínicos associados (prontuários, exames, etc.)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.deleted_at IS
  'Soft-delete: preenchido quando paciente é removido. Dados clínicos permanecem intactos conforme CFM Res. 1.821/2007.';
