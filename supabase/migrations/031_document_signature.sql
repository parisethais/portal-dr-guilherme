-- ============================================================
-- Migration 031 — Assinatura digital nos documentos clínicos
-- ============================================================

ALTER TABLE public.patient_documents
  ADD COLUMN IF NOT EXISTS assinado          BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assinado_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assinatura_url    TEXT,        -- .p7s CMS detached signature
  ADD COLUMN IF NOT EXISTS pdf_url           TEXT;        -- PDF gerado antes de assinar

-- Verificação pública: permite qualquer pessoa (anônima) ler metadados básicos de um documento
-- para validar via QR Code sem precisar de login.
CREATE POLICY "public_verify_patient_documents"
  ON public.patient_documents
  FOR SELECT
  USING (assinado = true);
