-- ============================================================
-- Migration 033 — Retorno 45min + tipo Reunião
-- ============================================================

-- 1. Atualiza duração do Retorno de 30 para 45 minutos
UPDATE public.clinic_consultation_types
SET duration_min = 45
WHERE name = 'Retorno';

-- 2. Adiciona tipo Reunião (se ainda não existir)
INSERT INTO public.clinic_consultation_types
  (name, slug, duration_min, default_value, color, active, sort_order)
SELECT
  'Reunião',
  'reuniao',
  45,
  0,
  '#0369a1',
  true,
  99
WHERE NOT EXISTS (
  SELECT 1 FROM public.clinic_consultation_types WHERE slug = 'reuniao'
);
