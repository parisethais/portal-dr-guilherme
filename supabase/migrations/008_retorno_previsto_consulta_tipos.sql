-- Adiciona campo retorno_previsto na tabela profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS retorno_previsto date;

-- Atualiza o tipo das consultas para incluir as novas categorias
-- (o campo tipo é texto livre com check constraint — recriamos o constraint)
ALTER TABLE consultas DROP CONSTRAINT IF EXISTS consultas_tipo_check;

ALTER TABLE consultas
  ADD CONSTRAINT consultas_tipo_check
  CHECK (tipo IN (
    'primeira_consulta',
    'nova_consulta',
    'retorno',
    'primeira_consulta_desconto',
    'nova_consulta_desconto',
    'urgencia',
    'telemedicina'
  ));
