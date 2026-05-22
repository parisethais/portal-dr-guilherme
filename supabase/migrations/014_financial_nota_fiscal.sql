-- Adiciona suporte a nota fiscal e vínculo com paciente nos lançamentos financeiros

ALTER TABLE financial_entries
  ADD COLUMN IF NOT EXISTS nota_fiscal_status text
    CHECK (nota_fiscal_status IN ('nao_se_aplica','a_solicitar','solicitada','emitida'))
    DEFAULT 'nao_se_aplica',
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Índice para buscar lançamentos por paciente
CREATE INDEX IF NOT EXISTS idx_financial_entries_patient_id
  ON financial_entries (patient_id)
  WHERE patient_id IS NOT NULL;

-- Comentários
COMMENT ON COLUMN financial_entries.nota_fiscal_status IS
  'Status da nota fiscal: nao_se_aplica | a_solicitar | solicitada | emitida';
COMMENT ON COLUMN financial_entries.patient_id IS
  'Paciente associado ao lançamento (opcional, usado para receitas de consulta)';
