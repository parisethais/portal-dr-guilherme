-- ── Sessões de MRPA ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_mrpa_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id   uuid REFERENCES clinics(id) ON DELETE SET NULL,
  doctor_id   uuid NOT NULL REFERENCES profiles(id),
  start_date  date NOT NULL DEFAULT CURRENT_DATE,
  days        smallint NOT NULL DEFAULT 5,
  notes       text,
  status      text DEFAULT 'em_andamento'
                CHECK (status IN ('em_andamento', 'concluida')),
  created_at  timestamptz DEFAULT now()
);

-- ── Leituras individuais ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_mrpa_readings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES patient_mrpa_sessions(id) ON DELETE CASCADE,
  patient_id  uuid NOT NULL REFERENCES profiles(id),
  day_number  smallint NOT NULL,   -- 1, 2, 3 ... n
  period      text NOT NULL        -- manha1 | manha2 | noite1 | noite2
                CHECK (period IN ('manha1','manha2','noite1','noite2')),
  sistolica   smallint,
  diastolica  smallint,
  fc          smallint,            -- frequência cardíaca (opcional)
  created_at  timestamptz DEFAULT now(),
  UNIQUE (session_id, day_number, period)
);

CREATE INDEX IF NOT EXISTS idx_mrpa_sessions_patient ON patient_mrpa_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_mrpa_readings_session ON patient_mrpa_readings(session_id);

ALTER TABLE patient_mrpa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_mrpa_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth mrpa sessions" ON patient_mrpa_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth mrpa readings" ON patient_mrpa_readings FOR ALL TO authenticated USING (true) WITH CHECK (true);
