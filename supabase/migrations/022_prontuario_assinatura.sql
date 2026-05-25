-- ============================================================
-- Migration 022 — Assinatura digital do prontuário (ICP-Brasil)
-- Execute no SQL Editor do projeto Supabase
-- ============================================================

ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS prontuario_pdf_url       TEXT,        -- PDF do prontuário (sem assinatura)
  ADD COLUMN IF NOT EXISTS prontuario_assinado       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prontuario_assinado_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prontuario_assinatura_url TEXT;       -- arquivo .p7s (CMS detached signature)
