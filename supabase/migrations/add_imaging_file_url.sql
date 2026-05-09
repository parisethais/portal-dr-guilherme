-- Adiciona suporte a arquivo de exame de imagem
ALTER TABLE imaging_results
  ADD COLUMN IF NOT EXISTS file_url  TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT;
