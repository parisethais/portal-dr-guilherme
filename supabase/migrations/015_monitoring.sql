-- ── Metas por paciente ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_goals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id     uuid REFERENCES clinics(id) ON DELETE SET NULL,
  doctor_id     uuid NOT NULL REFERENCES profiles(id),
  pa_alvo       text,            -- ex: "< 130/80 mmHg"
  peso_alvo_kg  numeric(5,1),
  frequencia    text DEFAULT 'quinzenal'
                  CHECK (frequencia IN ('semanal','quinzenal','mensal')),
  indicadores_extras text,       -- outros indicadores livres
  notas         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (patient_id)            -- uma meta ativa por paciente
);

-- ── Check-ins do paciente ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_checkins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id       uuid REFERENCES clinics(id) ON DELETE SET NULL,
  doctor_id       uuid NOT NULL REFERENCES profiles(id),
  recorded_by     uuid REFERENCES profiles(id), -- secretária/enfermeira que registrou
  checkin_date    date NOT NULL DEFAULT CURRENT_DATE,
  channel         text DEFAULT 'whatsapp'
                    CHECK (channel IN ('whatsapp','portal','telefone','presencial')),
  peso_kg         numeric(5,1),
  pa_sistolica    smallint,
  pa_diastolica   smallint,
  aderiu_dieta    text CHECK (aderiu_dieta IN ('sim','nao','parcial','nao_informado'))
                    DEFAULT 'nao_informado',
  aderiu_medicacao text CHECK (aderiu_medicacao IN ('sim','nao','parcial','nao_informado'))
                    DEFAULT 'nao_informado',
  sintomas        text,
  notas           text,
  created_at      timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_patient_goals_patient ON patient_goals(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_checkins_patient ON patient_checkins(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_checkins_date ON patient_checkins(patient_id, checkin_date DESC);

-- RLS
ALTER TABLE patient_goals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users manage goals"    ON patient_goals    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users manage checkins" ON patient_checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);
