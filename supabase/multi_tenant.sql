-- ══════════════════════════════════════════════════════════════════════════
-- MULTI-TENANT FOUNDATION
-- Execute este arquivo completo no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Tabela: clinics ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinics (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  slug         text        NOT NULL UNIQUE,   -- ex: "santa-catharina"
  logo_url     text,
  primary_color text       DEFAULT '#7EB8D4',
  owner_id     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  active       boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Superadmin vê tudo; membros veem a própria clínica
CREATE POLICY "clinics_select" ON clinics FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR
  EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinics.id AND user_id = auth.uid())
);

CREATE POLICY "clinics_all_superadmin" ON clinics FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- ── 2. Tabela: clinic_members ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    uuid        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'medico'
                           CHECK (role IN ('owner', 'medico', 'secretaria')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, user_id)
);

CREATE INDEX IF NOT EXISTS clinic_members_user_idx ON clinic_members (user_id);
CREATE INDEX IF NOT EXISTS clinic_members_clinic_idx ON clinic_members (clinic_id);

ALTER TABLE clinic_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_select" ON clinic_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1 FROM clinic_members cm2
    WHERE cm2.clinic_id = clinic_members.clinic_id
      AND cm2.user_id = auth.uid()
  )
);

CREATE POLICY "clinic_members_all_superadmin" ON clinic_members FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- ── 3. Tabela: clinic_settings ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_settings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    uuid        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  key          text        NOT NULL,
  value        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, key)
);

ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_settings_select" ON clinic_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1 FROM clinic_members
    WHERE clinic_id = clinic_settings.clinic_id AND user_id = auth.uid()
  )
);

CREATE POLICY "clinic_settings_all_superadmin" ON clinic_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- Médico pode editar settings da própria clínica
CREATE POLICY "clinic_settings_medico_update" ON clinic_settings FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM clinic_members
    WHERE clinic_id = clinic_settings.clinic_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'medico')
  )
);

-- ── 4. Adicionar clinic_id em profiles (pacientes) ────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_clinic_idx ON profiles (clinic_id);

-- ── 5. Adicionar superadmin ao check de role ──────────────────────────────

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'paciente'::text,
    'medico'::text,
    'secretaria'::text,
    'superadmin'::text
  ]));

-- ── 6. SEED: Clínica Santa Catharina ──────────────────────────────────────

-- Cria a clínica
INSERT INTO clinics (id, name, slug, primary_color, owner_id)
VALUES (
  'c1000000-0000-0000-0000-000000000001',
  'Clínica Santa Catharina',
  'santa-catharina',
  '#7EB8D4',
  'b892c4bf-7a5c-4afb-a1fd-a3e1f3f36bca'  -- Dr. Guilherme
)
ON CONFLICT (slug) DO NOTHING;

-- Adiciona membros
INSERT INTO clinic_members (clinic_id, user_id, role)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b892c4bf-7a5c-4afb-a1fd-a3e1f3f36bca', 'owner'),     -- Dr. Guilherme
  ('c1000000-0000-0000-0000-000000000001', '3413bcb9-dab0-4cfb-9b2a-5c5fd98cc3b5', 'secretaria') -- Secretaria
ON CONFLICT (clinic_id, user_id) DO NOTHING;

-- Settings iniciais da clínica
INSERT INTO clinic_settings (clinic_id, key, value)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'nome_exibicao',    'Clínica Santa Catharina'),
  ('c1000000-0000-0000-0000-000000000001', 'especialidade',    'Nefrologia'),
  ('c1000000-0000-0000-0000-000000000001', 'timezone',         'America/Sao_Paulo'),
  ('c1000000-0000-0000-0000-000000000001', 'moeda',            'BRL'),
  ('c1000000-0000-0000-0000-000000000001', 'cor_primaria',     '#7EB8D4')
ON CONFLICT (clinic_id, key) DO NOTHING;

-- Associa todos os pacientes existentes à clínica Santa Catharina
UPDATE profiles
SET clinic_id = 'c1000000-0000-0000-0000-000000000001'
WHERE role = 'paciente'
  AND clinic_id IS NULL;

-- Associa financial_entries existentes à clínica
UPDATE financial_entries
SET clinic_id = 'c1000000-0000-0000-0000-000000000001'
WHERE clinic_id IS NULL
  AND scope = 'clinic';

-- Associa exam_catalog global ao seed da clínica (mantém global por ora)
-- exam_catalog com clinic_id = NULL continua sendo o padrão global

-- ── 7. Setar Dev como superadmin ─────────────────────────────────────────

UPDATE profiles
SET role = 'superadmin'
WHERE id = 'e4d23c34-a3ed-4cc9-861b-2ea3313e12ee';  -- Dev (parisethais@gmail.com)
