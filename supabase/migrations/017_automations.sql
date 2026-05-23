-- ── Automações por clínica ───────────────────────────────────────────────
-- Motor de automações configuráveis: gatilho → condição → ação
-- Cada clínica ativa/desativa e parametriza individualmente

CREATE TABLE IF NOT EXISTS clinic_automations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Tipo da automação (slug único por clínica)
  type        text NOT NULL,
  -- Tipos disponíveis:
  --   pre_consulta_lembrete   — X horas antes da consulta
  --   pos_consulta            — após consulta realizada
  --   inativo_sem_consulta    — paciente sem consulta há N dias
  --   retorno_previsto        — N dias antes do retorno_previsto
  --   lab_critico             — quando alerta crítico de lab é registrado
  --   aniversario             — no dia do aniversário do paciente
  --   sumario_pre_consulta    — briefing IA antes da consulta (premium)

  active      boolean NOT NULL DEFAULT false,

  -- Parâmetros configuráveis (ex: { "dias": 90, "mensagem": "Olá {nome}..." })
  params      jsonb NOT NULL DEFAULT '{}',

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (clinic_id, type)
);

-- Log de execuções (auditoria + debug)
CREATE TABLE IF NOT EXISTS automation_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  automation_id   uuid NOT NULL REFERENCES clinic_automations(id) ON DELETE CASCADE,
  patient_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  triggered_at    timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL CHECK (status IN ('enviado', 'erro', 'ignorado')),
  channel         text CHECK (channel IN ('whatsapp', 'portal', 'email', 'interno')),
  result          jsonb DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clinic_automations_clinic ON clinic_automations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_clinic ON automation_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_patient ON automation_logs(patient_id);

-- RLS
ALTER TABLE clinic_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs    ENABLE ROW LEVEL SECURITY;

-- Superadmin acessa tudo; membros da clínica acessam a própria clínica
CREATE POLICY "automations_select" ON clinic_automations FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_automations.clinic_id AND user_id = auth.uid())
);

CREATE POLICY "automations_write" ON clinic_automations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinic_automations.clinic_id AND user_id = auth.uid() AND role IN ('owner','medico'))
);

CREATE POLICY "automation_logs_select" ON automation_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = automation_logs.clinic_id AND user_id = auth.uid())
);

CREATE POLICY "automation_logs_insert" ON automation_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = automation_logs.clinic_id AND user_id = auth.uid())
);

GRANT ALL ON clinic_automations TO authenticated;
GRANT ALL ON automation_logs    TO authenticated;
GRANT ALL ON clinic_automations TO service_role;
GRANT ALL ON automation_logs    TO service_role;
