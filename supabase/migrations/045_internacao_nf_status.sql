-- Status da NF da internação
ALTER TABLE public.internacoes
  ADD COLUMN IF NOT EXISTS nf_status TEXT CHECK (nf_status IN ('solicitada', 'emitida', 'paga')) DEFAULT NULL;
