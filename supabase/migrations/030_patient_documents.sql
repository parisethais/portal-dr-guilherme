-- ============================================================
-- Migration 030 — Documentos clínicos do paciente + modelos
-- ============================================================

-- Documentos do paciente (instâncias)
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  medico_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  content      TEXT        NOT NULL DEFAULT '',
  template_key TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_documents_patient_idx ON public.patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS patient_documents_clinic_idx  ON public.patient_documents(clinic_id);

ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_manage_patient_documents"
  ON public.patient_documents
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  );

-- Modelos personalizados da clínica
CREATE TABLE IF NOT EXISTS public.clinic_document_templates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  medico_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clinic_document_templates_clinic_idx ON public.clinic_document_templates(clinic_id);

ALTER TABLE public.clinic_document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_manage_document_templates"
  ON public.clinic_document_templates
  FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
  );
