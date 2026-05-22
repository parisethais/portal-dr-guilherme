-- Migration 013: adiciona permissões por membro de clínica
-- Execute no Supabase SQL Editor

-- 1. Coluna permissions em clinic_members
ALTER TABLE clinic_members
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- 2. Preenche defaults com base no role atual
UPDATE clinic_members
SET permissions = CASE
  WHEN role IN ('owner', 'medico') THEN
    '{"prontuario": true, "agenda": true, "financeiro": true, "pacientes": true, "mensagens": true}'::jsonb
  WHEN role = 'secretaria' THEN
    '{"prontuario": false, "agenda": true, "financeiro": false, "pacientes": true, "mensagens": true}'::jsonb
  ELSE '{}'::jsonb
END
WHERE permissions = '{}'::jsonb OR permissions IS NULL;

-- 3. Coluna notes opcional (observação interna do membro)
ALTER TABLE clinic_members
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
