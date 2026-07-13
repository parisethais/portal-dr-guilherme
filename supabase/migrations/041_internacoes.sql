-- Internações hospitalares
CREATE TABLE IF NOT EXISTS public.internacoes (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              TEXT        NOT NULL,
  patient_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital               TEXT        NOT NULL, -- 'sirio_libanes' | 'vila_nova_star' | 'einstein' | 'outro'
  hospital_outro         TEXT,
  data_internacao        DATE        NOT NULL,
  motivo_internacao      TEXT,
  data_alta              DATE,
  diagnostico_internacao TEXT,
  valor_visita           NUMERIC(10,2),
  finalizada             BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS internacoes_tenant_idx    ON public.internacoes(tenant_id);
CREATE INDEX IF NOT EXISTS internacoes_patient_idx   ON public.internacoes(patient_id);
CREATE INDEX IF NOT EXISTS internacoes_finalizada_idx ON public.internacoes(tenant_id, finalizada);

-- Visitas por internação
CREATE TABLE IF NOT EXISTS public.visitas_hospitalares (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  internacao_id UUID        NOT NULL REFERENCES public.internacoes(id) ON DELETE CASCADE,
  tenant_id     TEXT        NOT NULL,
  data_visita   DATE        NOT NULL,
  visitador     TEXT        NOT NULL,
  dialise       TEXT        NOT NULL DEFAULT 'nao', -- 'nao' | 'hdi' | 'sled' | 'crrt'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS visitas_internacao_idx ON public.visitas_hospitalares(internacao_id);
CREATE INDEX IF NOT EXISTS visitas_tenant_idx     ON public.visitas_hospitalares(tenant_id);

ALTER TABLE public.internacoes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas_hospitalares ENABLE ROW LEVEL SECURITY;

-- RLS: acesso via clinic_members → clinics → tenant_id
CREATE POLICY "internacoes_tenant" ON public.internacoes
  FOR ALL USING (
    tenant_id IN (
      SELECT c.tenant_id FROM public.clinics c
      INNER JOIN public.clinic_members cm ON cm.clinic_id = c.id
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "visitas_tenant" ON public.visitas_hospitalares
  FOR ALL USING (
    tenant_id IN (
      SELECT c.tenant_id FROM public.clinics c
      INNER JOIN public.clinic_members cm ON cm.clinic_id = c.id
      WHERE cm.user_id = auth.uid()
    )
  );

GRANT ALL ON public.internacoes         TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.visitas_hospitalares TO postgres, anon, authenticated, service_role;
