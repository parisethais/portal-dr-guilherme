-- Adiciona controle de finalização de prontuário por consulta
ALTER TABLE consultas
  ADD COLUMN IF NOT EXISTS prontuario_finalizado    BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prontuario_finalizado_at TIMESTAMPTZ;
