-- ============================================================
-- Migration 032 — Obs pessoal do paciente + melhorias em imagem
-- ============================================================

-- 1. Obs pessoal: nota do médico sobre o paciente (fora de consulta)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS obs_pessoal TEXT;

-- 2. Imagem: remove CHECK constraint para permitir tipos personalizados
ALTER TABLE public.imaging_results
  DROP CONSTRAINT IF EXISTS imaging_results_tipo_check;

-- 3. Imagem: arquivos extras (laudo + resultado separados)
ALTER TABLE public.imaging_results
  ADD COLUMN IF NOT EXISTS extra_files JSONB;
-- formato: [{"url": "...", "name": "..."}]
