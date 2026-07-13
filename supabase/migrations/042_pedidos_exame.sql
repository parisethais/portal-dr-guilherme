CREATE TABLE IF NOT EXISTS public.pedidos_exame (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id         TEXT        NOT NULL,
  created_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo              TEXT        NOT NULL DEFAULT 'laboratorial', -- 'laboratorial' | 'imagem' | 'outro'
  exames            TEXT        NOT NULL,  -- texto livre com os exames pedidos
  urgencia          TEXT        NOT NULL DEFAULT 'rotina', -- 'rotina' | 'urgente'
  indicacao_clinica TEXT,
  cid               TEXT,
  data_pedido       DATE        NOT NULL DEFAULT CURRENT_DATE,
  pdf_url           TEXT,
  assinatura_url    TEXT,
  assinado          BOOLEAN     NOT NULL DEFAULT FALSE,
  assinado_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pedidos_exame_patient_idx ON public.pedidos_exame(patient_id);
CREATE INDEX IF NOT EXISTS pedidos_exame_tenant_idx  ON public.pedidos_exame(tenant_id);

ALTER TABLE public.pedidos_exame ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedidos_exame_tenant" ON public.pedidos_exame
  FOR ALL USING (
    tenant_id IN (
      SELECT c.tenant_id FROM public.clinics c
      INNER JOIN public.clinic_members cm ON cm.clinic_id = c.id
      WHERE cm.user_id = auth.uid()
    )
  );

GRANT ALL ON public.pedidos_exame TO postgres, anon, authenticated, service_role;
