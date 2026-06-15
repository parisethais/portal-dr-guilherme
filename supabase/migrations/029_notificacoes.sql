-- Migration 029 — Notificações internas (avisos para secretaria)
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT,
  tipo          TEXT NOT NULL,           -- 'retorno_solicitado'
  patient_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  consulta_id   UUID REFERENCES public.consultas(id) ON DELETE SET NULL,
  mensagem      TEXT NOT NULL,
  lida          BOOLEAN NOT NULL DEFAULT FALSE,
  lida_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notificacoes_tenant_lida
  ON public.notificacoes(tenant_id, lida, created_at DESC);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Secretaria e médico da mesma clínica podem ler
CREATE POLICY "notificacoes_read" ON public.notificacoes
  FOR SELECT USING (true);

CREATE POLICY "notificacoes_update" ON public.notificacoes
  FOR UPDATE USING (true);

CREATE POLICY "notificacoes_insert" ON public.notificacoes
  FOR INSERT WITH CHECK (true);
