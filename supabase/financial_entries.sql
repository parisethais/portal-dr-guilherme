-- ──────────────────────────────────────────────────────────────────────────
-- financial_entries: lançamentos financeiros do médico
-- scope = 'clinic'   → receita/despesa da clínica (clinic_id obrigatório futuramente)
-- scope = 'personal' → renda pessoal do médico (plantão, aula, hospital etc.)
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS financial_entries (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      uuid,                              -- NULL = entrada pessoal
  doctor_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scope          text        NOT NULL DEFAULT 'clinic' CHECK (scope IN ('clinic', 'personal')),
  type           text        NOT NULL CHECK (type IN ('receita', 'despesa')),
  category       text        NOT NULL,
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  date           date        NOT NULL,
  description    text,
  payment_method text,                              -- dinheiro, pix, cartão, transferência
  status         text        NOT NULL DEFAULT 'pago' CHECK (status IN ('pago', 'pendente', 'cancelado')),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_entries_doctor_date_idx
  ON financial_entries (doctor_id, date DESC);

CREATE INDEX IF NOT EXISTS financial_entries_scope_idx
  ON financial_entries (doctor_id, scope, type, date DESC);

-- RLS
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_select" ON financial_entries
  FOR SELECT USING (
    doctor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'medico')
  );

CREATE POLICY "financial_insert" ON financial_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'medico')
  );

CREATE POLICY "financial_update" ON financial_entries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'medico')
  );

CREATE POLICY "financial_delete" ON financial_entries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'medico')
  );
