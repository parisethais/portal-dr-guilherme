-- ============================================================
-- Migration 021 — data_nascimento no perfil do médico
-- Obrigatório pela Memed a partir de fev/2026 (RDC n° 1000/25)
-- Execute no SQL Editor do projeto Supabase
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS data_nascimento DATE;  -- YYYY-MM-DD (armazenado como DATE no Postgres)
