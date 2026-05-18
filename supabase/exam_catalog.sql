-- ──────────────────────────────────────────────────────────────────────────
-- exam_catalog: catálogo de exames laboratoriais configurável por clínica
-- clinic_id = NULL  →  padrão global (seed abaixo)
-- clinic_id = X     →  customização da clínica X (multi-tenant futuro)
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exam_catalog (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid,                             -- NULL = padrão global
  name          text        NOT NULL,
  group_name    text        NOT NULL,
  unit          text        NOT NULL DEFAULT '',
  alt_units     text[],
  qualitative   boolean     NOT NULL DEFAULT false,
  normal_answer text,
  no_ref        boolean     NOT NULL DEFAULT false,
  ref_min       numeric,
  ref_max       numeric,
  warn_low      numeric,
  warn_high     numeric,
  crit_low      numeric,
  crit_high     numeric,
  higher_better boolean     NOT NULL DEFAULT false,
  unit_ranges   jsonb,
  sort_order    integer     NOT NULL DEFAULT 0,
  active        boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Índice principal para busca
CREATE INDEX IF NOT EXISTS exam_catalog_clinic_group_idx
  ON exam_catalog (clinic_id, group_name, sort_order);

-- Unicidade: mesmo exame não pode aparecer duas vezes na mesma clínica
CREATE UNIQUE INDEX IF NOT EXISTS exam_catalog_clinic_name_idx
  ON exam_catalog (clinic_id, name)
  WHERE clinic_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS exam_catalog_global_name_idx
  ON exam_catalog (name)
  WHERE clinic_id IS NULL;

-- RLS
ALTER TABLE exam_catalog ENABLE ROW LEVEL SECURITY;

-- Médico/secretaria lê o catálogo da sua clínica ou o global
CREATE POLICY "exam_catalog_select" ON exam_catalog
  FOR SELECT USING (true);

-- Somente médico pode modificar
CREATE POLICY "exam_catalog_insert" ON exam_catalog
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'medico')
  );

CREATE POLICY "exam_catalog_update" ON exam_catalog
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'medico')
  );

CREATE POLICY "exam_catalog_delete" ON exam_catalog
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'medico')
  );

-- ──────────────────────────────────────────────────────────────────────────
-- SEED — catálogo padrão global (clinic_id = NULL)
-- ──────────────────────────────────────────────────────────────────────────

INSERT INTO exam_catalog
  (name, group_name, unit, alt_units, qualitative, normal_answer, no_ref,
   ref_min, ref_max, warn_low, warn_high, crit_low, crit_high,
   higher_better, unit_ranges, sort_order)
VALUES

-- ── FUNÇÃO RENAL ────────────────────────────────────────────────────────
('Ureia',          'Função Renal', 'mg/dL', NULL, false, NULL, false, 10,   50,   5,    80,   0,    120,  false, NULL, 1),
('Creatinina',     'Função Renal', 'mg/dL', NULL, false, NULL, false, 0.7,  1.3,  NULL, 2.0,  NULL, 4.0,  false, NULL, 2),
('Sódio',          'Função Renal', 'mEq/L', NULL, false, NULL, false, 136,  145,  130,  150,  125,  155,  false, NULL, 3),
('Potássio',       'Função Renal', 'mEq/L', NULL, false, NULL, false, 3.5,  5.0,  3.0,  5.5,  2.5,  6.0,  false, NULL, 4),
('Cálcio iônico',  'Função Renal', 'mmol/L', ARRAY['mg/dL'], false, NULL, false, 1.12, 1.32, 1.05, 1.45, 0.9, 1.6, false,
  '{"mg/dL": {"refMin": 4.5, "refMax": 5.2, "warnLow": 4.0, "warnHigh": 5.6, "critLow": 3.5, "critHigh": 6.0}}'::jsonb, 5),
('Magnésio',       'Função Renal', 'mg/dL', ARRAY['mmol/L'], false, NULL, false, 1.6, 2.6, 1.2, 3.0, 0.8, 4.0, false,
  '{"mmol/L": {"refMin": 0.66, "refMax": 1.07, "warnLow": 0.49, "warnHigh": 1.23, "critLow": 0.33, "critHigh": 1.65}}'::jsonb, 6),
('Fósforo',        'Função Renal', 'mg/dL', NULL, false, NULL, false, 2.5,  4.5,  1.5,  6.0,  1.0,  8.0,  false, NULL, 7),
('Ácido úrico',    'Função Renal', 'mg/dL', NULL, false, NULL, false, 3.4,  7.0,  NULL, 9.0,  NULL, 12.0, false, NULL, 8),

-- ── HEMATOLOGIA ─────────────────────────────────────────────────────────
('Hemoglobina',  'Hematologia', 'g/dL',  NULL, false, NULL, false, 12.0,   17.5,   10.0,   18.5,   8.0,   20.0,   false, NULL, 1),
('Hematócrito',  'Hematologia', '%',     NULL, false, NULL, false, 36,     53,     24,     57,     18,    65,     false, NULL, 2),
('Leucócitos',   'Hematologia', '/mm³',  NULL, false, NULL, false, 4000,   10000,  3000,   15000,  2000,  30000,  false, NULL, 3),
('Neutrófilos',  'Hematologia', '/mm³',  NULL, false, NULL, false, 1800,   7500,   1000,   10000,  500,   20000,  false, NULL, 4),
('Linfócitos',   'Hematologia', '/mm³',  NULL, false, NULL, false, 1000,   4800,   700,    6000,   400,   10000,  false, NULL, 5),
('Plaquetas',    'Hematologia', '/mm³',  NULL, false, NULL, false, 150000, 400000, 100000, 600000, 50000, 1000000, false, NULL, 6),

-- ── METABOLISMO ÓSSEO ───────────────────────────────────────────────────
('PTH',                'Metabolismo Ósseo', 'pg/mL', NULL, false, NULL, false, 15,  65,  NULL, 150,  NULL, 300,  false, NULL, 1),
('Vitamina D 25-OH',   'Metabolismo Ósseo', 'ng/mL', NULL, false, NULL, false, 30,  100, 20,   150,  10,   200,  true,  NULL, 2),
('Fosfatase alcalina', 'Metabolismo Ósseo', 'U/L',   NULL, false, NULL, false, 40,  130, NULL, 300,  NULL, 500,  false, NULL, 3),

-- ── GLICEMIA ────────────────────────────────────────────────────────────
('Glicemia de jejum',    'Glicemia', 'mg/dL', NULL, false, NULL, false, 70,  99,  60,   125,  50,   250,  false, NULL, 1),
('Hemoglobina glicada',  'Glicemia', '%',     NULL, false, NULL, false, 4.0, 5.6, NULL, 8.0,  NULL, 10.0, false, NULL, 2),

-- ── TIREÓIDE ────────────────────────────────────────────────────────────
('TSH',     'Tireóide', 'mUI/L', NULL, false, NULL, false, 0.4,  4.0, 0.1,  10.0, 0.05, 20.0, false, NULL, 1),
('T4 livre','Tireóide', 'ng/dL', NULL, false, NULL, false, 0.8,  1.8, 0.5,  3.0,  0.3,  5.0,  false, NULL, 2),

-- ── FERRO ───────────────────────────────────────────────────────────────
('Ferritina',                       'Ferro', 'ng/mL', NULL, false, NULL, false, 12,  300, 5,   500, 0,  1000, false, NULL, 1),
('Índice de saturação de transferrina', 'Ferro', '%', NULL, false, NULL, false, 20,  50,  10,  60,  5,  80,   false, NULL, 2),

-- ── PROTEÍNAS SÉRICAS ───────────────────────────────────────────────────
('Eletroforese: pico monoclonal',        'Proteínas Séricas', 'neg/pos', NULL, true,  'neg', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 1),
('Eletroforese: conc. pico monoclonal',  'Proteínas Séricas', 'g/dL',   ARRAY['g/L'], false, NULL, false, NULL, 0, NULL, 1.0, NULL, 2.0, false,
  '{"g/L": {"refMax": 0, "warnHigh": 10, "critHigh": 20}}'::jsonb, 2),
('Imunofixação proteínas séricas',       'Proteínas Séricas', 'neg/pos', NULL, true,  'neg', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 3),

-- ── LIPÍDIOS ────────────────────────────────────────────────────────────
('Colesterol total',  'Lipídios', 'mg/dL', NULL, false, NULL, false, NULL, 200, NULL, 239, NULL, 300, false, NULL, 1),
('HDL-colesterol',    'Lipídios', 'mg/dL', NULL, false, NULL, false, 50,  NULL, 35,  NULL, 25,  NULL, true,  NULL, 2),
('LDL-colesterol',    'Lipídios', 'mg/dL', NULL, false, NULL, false, NULL, 130, NULL, 160, NULL, 190, false, NULL, 3),
('Triglicerídeos',    'Lipídios', 'mg/dL', NULL, false, NULL, false, NULL, 150, NULL, 200, NULL, 500, false, NULL, 4),
('Lp(a)',             'Lipídios', 'mg/dL', ARRAY['nmol/L'], false, NULL, false, NULL, 30, NULL, 50, NULL, 75, false,
  '{"nmol/L": {"refMax": 75, "warnHigh": 100, "critHigh": 125}}'::jsonb, 5),
('ApoB',              'Lipídios', 'mg/dL', NULL, false, NULL, false, NULL, 100, NULL, 130, NULL, 160, false, NULL, 6),
('CPK',               'Lipídios', 'U/L',   NULL, false, NULL, false, NULL, 200, NULL, 500, NULL, 1000, false, NULL, 7),
('DHL',               'Lipídios', 'U/L',   NULL, false, NULL, false, 135, 225, NULL, 400, NULL, 600, false, NULL, 8),

-- ── FÍGADO ──────────────────────────────────────────────────────────────
('Gama GT',            'Fígado', 'U/L',   NULL, false, NULL, false, NULL, 73,  NULL, 150, NULL, 300, false, NULL, 1),
('Bilirrubina total',  'Fígado', 'mg/dL', NULL, false, NULL, false, NULL, 1.2, NULL, 3.0, NULL, 6.0, false, NULL, 2),
('Bilirrubina direta', 'Fígado', 'mg/dL', NULL, false, NULL, false, NULL, 0.3, NULL, 1.5, NULL, 3.0, false, NULL, 3),
('Bilirrubina indireta','Fígado','mg/dL', NULL, false, NULL, false, NULL, 0.8, NULL, 2.5, NULL, 5.0, false, NULL, 4),
('TGO/AST',            'Fígado', 'U/L',   NULL, false, NULL, false, NULL, 40,  NULL, 120, NULL, 300, false, NULL, 5),
('TGP/ALT',            'Fígado', 'U/L',   NULL, false, NULL, false, NULL, 40,  NULL, 120, NULL, 300, false, NULL, 6),

-- ── VITAMINAS ───────────────────────────────────────────────────────────
('Ácido fólico',  'Vitaminas', 'ng/mL', NULL, false, NULL, false, 3.1,  NULL, 2.0,  NULL, 1.5,  NULL, true,  NULL, 1),
('Vitamina B12',  'Vitaminas', 'pg/mL', NULL, false, NULL, false, 200,  900,  150,  NULL, 100,  NULL, true,  NULL, 2),

-- ── GASOMETRIA VENOSA ────────────────────────────────────────────────────
('Gasometria venosa: pH',          'Gasometria Venosa', 'sem unidade', NULL, false, NULL, false, 7.32, 7.42, 7.25, 7.50, 7.10, 7.60, false, NULL, 1),
('Gasometria venosa: bicarbonato', 'Gasometria Venosa', 'mmol/L',      NULL, false, NULL, false, 22,   28,   15,   35,   10,   40,   false, NULL, 2),
('Gasometria venosa: pCO₂',        'Gasometria Venosa', 'mmHg',        NULL, false, NULL, false, 40,   52,   30,   60,   20,   70,   false, NULL, 3),
('Gasometria venosa: BE',          'Gasometria Venosa', 'mmol/L',      NULL, false, NULL, false, -3,   3,    -8,   8,    -12,  12,   false, NULL, 4),

-- ── AUTOIMUNE ────────────────────────────────────────────────────────────
('Anti-Sm',         'Autoimune', 'neg/pos', NULL,          true,  'neg', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 1),
('Anti-DNA',        'Autoimune', 'neg/pos', ARRAY['UI/mL'],true,  'neg', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 2),
('Anti-RNP',        'Autoimune', 'neg/pos', NULL,          true,  'neg', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 3),
('Anti-Ro/SSA',     'Autoimune', 'neg/pos', NULL,          true,  'neg', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 4),
('Anti-La/SSB',     'Autoimune', 'neg/pos', NULL,          true,  'neg', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 5),
('Complemento C3',  'Autoimune', 'mg/dL',   NULL,          false, NULL,  false, 90,   180,  60,   NULL, 40,   NULL, false, NULL, 6),
('Complemento C4',  'Autoimune', 'mg/dL',   NULL,          false, NULL,  false, 16,   47,   8,    NULL, 4,    NULL, false, NULL, 7),

-- ── SOROLOGIAS ───────────────────────────────────────────────────────────
('Anti-HCV',                  'Sorologias', 'react/n.react', NULL, true,  'n.react', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 1),
('HBsAg',                     'Sorologias', 'react/n.react', NULL, true,  'n.react', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 2),
('Anti-HBs',                  'Sorologias', 'mUI/mL',        NULL, false, NULL,      false, 10,   NULL, 10,   NULL, 0,    NULL, true,  NULL, 3),
('Anti-HBc total',            'Sorologias', 'react/n.react', NULL, true,  'n.react', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 4),
('Anti-HBc IgM',              'Sorologias', 'react/n.react', NULL, true,  'n.react', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 5),
('HIV 1/2',                   'Sorologias', 'react/n.react', NULL, true,  'n.react', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 6),
('Sífilis: VDRL',             'Sorologias', 'título',        NULL, false, NULL,      true,  NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 7),
('Sífilis: teste treponêmico','Sorologias', 'react/n.react', NULL, true,  'n.react', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 8),

-- ── URINA ────────────────────────────────────────────────────────────────
('Urina 1: pH urinário',    'Urina', 'sem unidade', NULL, false, NULL, false, 4.5,  8.0,  NULL, NULL, NULL, NULL, false, NULL, 1),
('Urina 1: glicose',        'Urina', 'neg/pos',     NULL, true,  'neg', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 2),
('Urina 1: hemácias',       'Urina', '/campo', ARRAY['/mL'], false, NULL, false, NULL, 5, NULL, 10, NULL, 20, false,
  '{"/mL": {"refMax": 10000, "warnHigh": 25000, "critHigh": 100000}}'::jsonb, 3),
('Urina 1: leucócitos',     'Urina', '/campo', ARRAY['/mL'], false, NULL, false, NULL, 5, NULL, 10, NULL, 20, false,
  '{"/mL": {"refMax": 10000, "warnHigh": 25000, "critHigh": 100000}}'::jsonb, 4),
('Urina 1: proteína',       'Urina', 'neg/pos', NULL, true, 'neg', false, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, 5),
('Relação proteína/creatinina urinária', 'Urina', 'mg/g creatinina', ARRAY['g/g creatinina'], false, NULL, false, NULL, 200, NULL, 500, NULL, 3500, false,
  '{"g/g creatinina": {"refMax": 0.2, "warnHigh": 0.5, "critHigh": 3.5}}'::jsonb, 6),
('Relação albumina/creatinina urinária', 'Urina', 'mg/g creatinina', NULL, false, NULL, false, NULL, 30, NULL, 300, NULL, 3000, false, NULL, 7),
('Proteína urinária 24h',   'Urina', 'mg/24h', ARRAY['g/24h'], false, NULL, false, NULL, 150, NULL, 500, NULL, 3500, false,
  '{"g/24h": {"refMax": 0.15, "warnHigh": 0.5, "critHigh": 3.5}}'::jsonb, 8)

ON CONFLICT DO NOTHING;
