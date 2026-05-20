-- ══════════════════════════════════════════════════════════════════════════
-- 012: Adiciona slug aos tipos de consulta e corrige dados do Dr. Guilherme
-- ══════════════════════════════════════════════════════════════════════════

-- Adiciona coluna slug (vincula ao ConsultaTipo da aplicação)
ALTER TABLE clinic_consultation_types
  ADD COLUMN IF NOT EXISTS slug text;

-- Índice único: cada clínica só pode ter um registro por slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_consultation_types_clinic_slug
  ON clinic_consultation_types(clinic_id, slug)
  WHERE slug IS NOT NULL;

-- ── Corrige os dados da Clínica Santa Catharina (Dr. Guilherme) ──────────
-- Remove entradas antigas (erradas: valores R$350/200/250/150, Urgência, Telemedicina como tipo)
DELETE FROM clinic_consultation_types
WHERE clinic_id = 'c1000000-0000-0000-0000-000000000001';

-- Insere os dados corretos com slugs, durations e valores reais
INSERT INTO clinic_consultation_types
  (clinic_id, slug, name, duration_min, color, default_value, sort_order, active)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'primeira_consulta',          'Primeira Consulta',            75, '#1e40af', 1000.00, 0, true),
  ('c1000000-0000-0000-0000-000000000001', 'nova_consulta',              'Nova Consulta',                45, '#0f766e', 1000.00, 1, true),
  ('c1000000-0000-0000-0000-000000000001', 'retorno',                    'Retorno',                      30, '#64748b',    0.00, 2, true),
  ('c1000000-0000-0000-0000-000000000001', 'primeira_consulta_desconto', 'Primeira Consulta (Desconto)', 75, '#d97706',  500.00, 3, true),
  ('c1000000-0000-0000-0000-000000000001', 'nova_consulta_desconto',     'Nova Consulta (Desconto)',     45, '#7c3aed',  500.00, 4, true);
