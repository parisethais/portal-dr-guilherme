-- ============================================================
-- Módulo de Agendamento — tabela consultas
-- Dependência: função get_my_role() já deve existir (criada em migrations anteriores)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.consultas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo        TEXT        NOT NULL CHECK (tipo IN ('primeira_consulta', 'retorno', 'urgencia', 'telemedicina')),
  local       TEXT        NOT NULL CHECK (local IN ('consultorio', 'telemedicina')),
  data_hora   TIMESTAMPTZ NOT NULL,
  duracao_min INTEGER     NOT NULL DEFAULT 30,
  status      TEXT        NOT NULL DEFAULT 'agendada'
                          CHECK (status IN ('agendada', 'confirmada', 'realizada', 'falta', 'cancelada')),
  observacoes TEXT,
  created_by  UUID        REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_consultas_patient_id ON public.consultas(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultas_data_hora  ON public.consultas(data_hora);
CREATE INDEX IF NOT EXISTS idx_consultas_status     ON public.consultas(status);

-- RLS
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;

-- Médico: acesso total (leitura, criação, edição)
CREATE POLICY "medico_full_access_consultas" ON public.consultas
  FOR ALL
  USING     (get_my_role() = 'medico')
  WITH CHECK (get_my_role() = 'medico');

-- Paciente: somente leitura das próprias consultas
CREATE POLICY "paciente_read_own_consultas" ON public.consultas
  FOR SELECT
  USING (patient_id = auth.uid() AND get_my_role() = 'paciente');
