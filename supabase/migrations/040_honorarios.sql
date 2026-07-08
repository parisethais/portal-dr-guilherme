-- Honorários externos / aulas (cobranças avulsas que não são consultas)
CREATE TABLE IF NOT EXISTS public.honorarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data            DATE NOT NULL,
  descricao       TEXT NOT NULL,
  fonte_pagadora  TEXT NOT NULL,
  valor           NUMERIC(10,2) NOT NULL DEFAULT 0,
  nota_emitida    BOOLEAN NOT NULL DEFAULT FALSE,
  pago            BOOLEAN NOT NULL DEFAULT FALSE,
  obs             TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS honorarios_tenant_idx ON public.honorarios(tenant_id);
CREATE INDEX IF NOT EXISTS honorarios_data_idx   ON public.honorarios(data DESC);

ALTER TABLE public.honorarios ENABLE ROW LEVEL SECURITY;

-- Médico/secretaria do mesmo tenant
CREATE POLICY "honorarios_tenant_access" ON public.honorarios
  FOR ALL USING (
    tenant_id IN (
      SELECT t.tenant_id FROM public.clinic_members cm
        JOIN public.clinics t ON t.id = cm.clinic_id
        WHERE cm.user_id = auth.uid()
    )
  );
