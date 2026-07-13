-- Armazena valor por visita específico de cada visitador (exceto Guilherme)
ALTER TABLE public.internacoes
  ADD COLUMN IF NOT EXISTS valor_por_visitador JSONB;
-- Ex: { "Lecticia": 500.00, "Fernando": 300.00, "Jeison": 400.00 }
