-- ============================================================
-- Migration 011 — Pendências acumuladas
-- Rode este arquivo no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. imaging_results: colunas de arquivo (add_imaging_file_url.sql)
ALTER TABLE public.imaging_results
  ADD COLUMN IF NOT EXISTS file_url  TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT;

-- 2. invoices: data da consulta e número da nota (009)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS consulta_date DATE,
  ADD COLUMN IF NOT EXISTS numero_nota   TEXT;

-- 3. consultas: exame físico, sinais vitais e impressão (010)
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS exame_fisico TEXT,
  ADD COLUMN IF NOT EXISTS pas          SMALLINT,
  ADD COLUMN IF NOT EXISTS pad          SMALLINT,
  ADD COLUMN IF NOT EXISTS fc           SMALLINT,
  ADD COLUMN IF NOT EXISTS impressao    TEXT;

-- 4. lab_results: garante índice de upsert (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lab_results_patient_exam_date_unique'
  ) THEN
    ALTER TABLE public.lab_results
      ADD CONSTRAINT lab_results_patient_exam_date_unique
      UNIQUE (patient_id, exam_name, collected_at);
  END IF;
END $$;
