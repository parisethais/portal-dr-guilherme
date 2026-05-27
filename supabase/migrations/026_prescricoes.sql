CREATE TABLE IF NOT EXISTS prescricoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL,
  created_by    UUID REFERENCES profiles(id),
  medicamento   TEXT NOT NULL,
  dose          TEXT,
  posologia     TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  data_inicio   DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim      DATE,
  obs           TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
