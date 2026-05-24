-- ============================================================
-- Migration 019 — Isolamento multi-tenant
-- Adiciona tenant_id em todas as tabelas com dados de paciente
-- DEFAULT 'dr_guilherme' garante que dados existentes ficam corretos
-- ============================================================

-- ── 1. tenant_id na tabela de clínicas ──────────────────────
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

-- Garante que a clínica do Gui tem o tenant correto
UPDATE public.clinics SET tenant_id = 'dr_guilherme' WHERE tenant_id = 'dr_guilherme';

-- ── 2. tenant_id nas tabelas de pacientes ────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

ALTER TABLE public.imaging_results
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

ALTER TABLE public.patient_exams
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

ALTER TABLE public.care_plans
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

ALTER TABLE public.care_plan_attachments
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

ALTER TABLE public.patient_mrpa_sessions
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

ALTER TABLE public.patient_mrpa_readings
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'dr_guilherme';

-- ── 3. Índices para performance ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clinics_tenant              ON public.clinics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant             ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consultas_tenant            ON public.consultas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant             ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_tenant          ON public.lab_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_imaging_results_tenant      ON public.imaging_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant            ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant             ON public.messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_exams_tenant        ON public.patient_exams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_care_plans_tenant           ON public.care_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_attachments_tenant ON public.care_plan_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mrpa_sessions_tenant        ON public.patient_mrpa_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mrpa_readings_tenant        ON public.patient_mrpa_readings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_tenant    ON public.financial_entries(tenant_id);

-- ── 4. Clínica demo para testes Memed (tenant isolado) ───────
-- Garante que existe uma clínica demo separada da do Gui
INSERT INTO public.clinics (name, active, tenant_id)
VALUES ('MedEn Demo', false, 'meden_demo')
ON CONFLICT DO NOTHING;

-- Paciente teste pertence ao tenant demo (não ao dr_guilherme)
UPDATE public.profiles
SET tenant_id = 'meden_demo'
WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- Dr. Teste pertence ao tenant demo
UPDATE public.profiles
SET tenant_id = 'meden_demo'
WHERE id = '7862570b-1702-44d8-b487-e0a7cfbde05b';

-- Vincula Dr. Teste à clínica demo
INSERT INTO public.clinic_members (clinic_id, user_id, role)
SELECT c.id, '7862570b-1702-44d8-b487-e0a7cfbde05b', 'medico'
FROM public.clinics c
WHERE c.tenant_id = 'meden_demo'
ON CONFLICT DO NOTHING;

-- Remove Dr. Teste da clínica do Gui (se foi adicionado por engano)
DELETE FROM public.clinic_members
WHERE user_id = '7862570b-1702-44d8-b487-e0a7cfbde05b'
  AND clinic_id IN (
    SELECT id FROM public.clinics WHERE tenant_id = 'dr_guilherme'
  );
