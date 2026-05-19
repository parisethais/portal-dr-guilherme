-- ══════════════════════════════════════════════════════════════════════════
-- Extensões multi-tenant: convênios, horários e tipos de consulta
-- ══════════════════════════════════════════════════════════════════════════

-- ── clinic_convenios ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_convenios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name          text NOT NULL,
  code          text,
  default_value decimal(10,2) DEFAULT 0,
  active        boolean DEFAULT true,
  sort_order    int DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_convenios_clinic ON clinic_convenios(clinic_id);

ALTER TABLE clinic_convenios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "convenios_select" ON clinic_convenios FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_convenios.clinic_id AND user_id = auth.uid())
);

CREATE POLICY "convenios_insert" ON clinic_convenios FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_convenios.clinic_id AND user_id = auth.uid() AND role IN ('owner','medico'))
);

CREATE POLICY "convenios_update" ON clinic_convenios FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_convenios.clinic_id AND user_id = auth.uid() AND role IN ('owner','medico'))
);

CREATE POLICY "convenios_delete" ON clinic_convenios FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_convenios.clinic_id AND user_id = auth.uid() AND role IN ('owner','medico'))
);

GRANT ALL ON public.clinic_convenios TO service_role;

-- ── clinic_schedule ───────────────────────────────────────────────────────
-- day_of_week: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb (JS convention)

CREATE TABLE IF NOT EXISTS clinic_schedule (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  day_of_week  int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time    time NOT NULL DEFAULT '08:00',
  close_time   time NOT NULL DEFAULT '18:00',
  active       boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (clinic_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_clinic_schedule_clinic ON clinic_schedule(clinic_id);

ALTER TABLE clinic_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_select" ON clinic_schedule FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_schedule.clinic_id AND user_id = auth.uid())
);

CREATE POLICY "schedule_insert" ON clinic_schedule FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_schedule.clinic_id AND user_id = auth.uid() AND role IN ('owner','medico'))
);

CREATE POLICY "schedule_update" ON clinic_schedule FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_schedule.clinic_id AND user_id = auth.uid() AND role IN ('owner','medico'))
);

CREATE POLICY "schedule_delete" ON clinic_schedule FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

GRANT ALL ON public.clinic_schedule TO service_role;

-- ── clinic_consultation_types ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_consultation_types (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name          text NOT NULL,
  duration_min  int NOT NULL DEFAULT 30,
  color         text DEFAULT '#7EB8D4',
  default_value decimal(10,2) DEFAULT 0,
  active        boolean DEFAULT true,
  sort_order    int DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_consultation_types_clinic ON clinic_consultation_types(clinic_id);

ALTER TABLE clinic_consultation_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultation_types_select" ON clinic_consultation_types FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_consultation_types.clinic_id AND user_id = auth.uid())
);

CREATE POLICY "consultation_types_insert" ON clinic_consultation_types FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_consultation_types.clinic_id AND user_id = auth.uid() AND role IN ('owner','medico'))
);

CREATE POLICY "consultation_types_update" ON clinic_consultation_types FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_consultation_types.clinic_id AND user_id = auth.uid() AND role IN ('owner','medico'))
);

CREATE POLICY "consultation_types_delete" ON clinic_consultation_types FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_consultation_types.clinic_id AND user_id = auth.uid() AND role IN ('owner','medico'))
);

GRANT ALL ON public.clinic_consultation_types TO service_role;

-- ── Seed: Clínica Santa Catharina ─────────────────────────────────────────

INSERT INTO clinic_convenios (clinic_id, name, code, default_value, sort_order) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Particular',      'particular',  350.00, 0),
  ('c1000000-0000-0000-0000-000000000001', 'UNIMED',          'unimed',        0.00, 1),
  ('c1000000-0000-0000-0000-000000000001', 'Bradesco Saúde',  'bradesco',      0.00, 2),
  ('c1000000-0000-0000-0000-000000000001', 'Amil',            'amil',          0.00, 3),
  ('c1000000-0000-0000-0000-000000000001', 'SulAmérica',      'sulamerica',    0.00, 4)
ON CONFLICT DO NOTHING;

INSERT INTO clinic_schedule (clinic_id, day_of_week, open_time, close_time, active) VALUES
  ('c1000000-0000-0000-0000-000000000001', 0, '08:00', '18:00', false),  -- Dom
  ('c1000000-0000-0000-0000-000000000001', 1, '08:00', '18:00', true),   -- Seg
  ('c1000000-0000-0000-0000-000000000001', 2, '08:00', '18:00', true),   -- Ter
  ('c1000000-0000-0000-0000-000000000001', 3, '08:00', '18:00', true),   -- Qua
  ('c1000000-0000-0000-0000-000000000001', 4, '08:00', '18:00', true),   -- Qui
  ('c1000000-0000-0000-0000-000000000001', 5, '08:00', '18:00', true),   -- Sex
  ('c1000000-0000-0000-0000-000000000001', 6, '08:00', '12:00', false)   -- Sáb
ON CONFLICT (clinic_id, day_of_week) DO NOTHING;

INSERT INTO clinic_consultation_types (clinic_id, name, duration_min, color, default_value, sort_order) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Primeira Consulta',          60, '#7EB8D4', 350.00, 0),
  ('c1000000-0000-0000-0000-000000000001', 'Retorno',                    30, '#5BA3C4', 200.00, 1),
  ('c1000000-0000-0000-0000-000000000001', 'Primeira Consulta Desconto', 60, '#93C5D4', 250.00, 2),
  ('c1000000-0000-0000-0000-000000000001', 'Nova Consulta Desconto',     30, '#93C5D4', 150.00, 3),
  ('c1000000-0000-0000-0000-000000000001', 'Urgência',                   30, '#EF4444', 350.00, 4),
  ('c1000000-0000-0000-0000-000000000001', 'Telemedicina',               45, '#8B5CF6', 300.00, 5)
ON CONFLICT DO NOTHING;
