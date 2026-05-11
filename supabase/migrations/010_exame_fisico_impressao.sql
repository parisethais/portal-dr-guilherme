-- Campos de exame físico, sinais vitais e impressão clínica nas consultas
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS exame_fisico text;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS pas          smallint;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS pad          smallint;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS fc           smallint;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS impressao    text;
