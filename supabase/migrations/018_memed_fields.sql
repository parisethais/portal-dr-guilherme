-- ============================================================
-- Migration 018 — Campos Memed no perfil do médico
-- Execute no SQL Editor do projeto Supabase
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS crm           TEXT,           -- ex: "SP-123456"
  ADD COLUMN IF NOT EXISTS especialidade TEXT,           -- ex: "Nefrologia"
  ADD COLUMN IF NOT EXISTS memed_token   TEXT,           -- JWT cacheado do Memed (TTL gerenciado pelo backend)
  ADD COLUMN IF NOT EXISTS memed_token_at TIMESTAMPTZ;  -- quando o token foi gerado
