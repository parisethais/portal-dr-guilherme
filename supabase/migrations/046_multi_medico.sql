-- Migration 046 — Multi-médico por clínica
-- Execute no Supabase SQL Editor ANTES do deploy do código correspondente.
--
-- O que faz:
--   1. doctor_id em consultas e profiles (médico responsável), com backfill
--      automático para o médico existente de cada tenant (Gui no dr_guilherme).
--   2. Salas da clínica (clinic_rooms) + room_id nas consultas.
--   3. Compartilhamento de agenda entre clínicas (agenda_shares) — para a
--      recepcionista da Medrenal ver a agenda do Gui (somente leitura).
--   4. Novos papéis: recepcionista e administrativo (auxiliar administrativo).
--   5. Permissões estendidas por membro.
--
-- Nada muda para o tenant dr_guilherme: o backfill atribui tudo ao Gui e a
-- Gi ganha explicitamente financeiro=true (comportamento que ela já tem hoje).

-- ── 1. doctor_id em consultas ────────────────────────────────────────────
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.profiles(id);

-- Backfill: o médico (owner/medico) da clínica de cada tenant
UPDATE public.consultas c
SET doctor_id = sub.user_id
FROM (
  SELECT DISTINCT ON (cl.tenant_id) cl.tenant_id, cm.user_id
  FROM public.clinic_members cm
  JOIN public.clinics cl ON cl.id = cm.clinic_id
  WHERE cm.role IN ('owner', 'medico')
  ORDER BY cl.tenant_id, cm.created_at
) sub
WHERE c.tenant_id = sub.tenant_id
  AND c.doctor_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_consultas_doctor ON public.consultas(doctor_id);

-- ── 2. doctor_id em profiles (médico responsável pelo paciente) ──────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.profiles(id);

UPDATE public.profiles p
SET doctor_id = sub.user_id
FROM (
  SELECT DISTINCT ON (cl.tenant_id) cl.tenant_id, cm.user_id
  FROM public.clinic_members cm
  JOIN public.clinics cl ON cl.id = cm.clinic_id
  WHERE cm.role IN ('owner', 'medico')
  ORDER BY cl.tenant_id, cm.created_at
) sub
WHERE p.tenant_id = sub.tenant_id
  AND p.role = 'paciente'
  AND p.doctor_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_doctor ON public.profiles(doctor_id);

-- ── 3. Salas da clínica ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinic_rooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_rooms_clinic ON public.clinic_rooms(clinic_id);

ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.clinic_rooms(id);

-- ── 4. Compartilhamento de agenda entre clínicas ─────────────────────────
-- O médico (dono do dado) concede a outra clínica visão somente-leitura da
-- própria agenda: horário, nome do paciente e sala. Revogável (active=false).
CREATE TABLE IF NOT EXISTS public.agenda_shares (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_tenant_id   TEXT NOT NULL,
  grantee_clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, grantee_clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_agenda_shares_grantee ON public.agenda_shares(grantee_clinic_id);

-- ── 5. Papéis novos ──────────────────────────────────────────────────────
ALTER TABLE public.clinic_members DROP CONSTRAINT IF EXISTS clinic_members_role_check;
ALTER TABLE public.clinic_members ADD CONSTRAINT clinic_members_role_check
  CHECK (role IN ('owner', 'medico', 'secretaria', 'recepcionista', 'administrativo'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'paciente'::text,
    'medico'::text,
    'secretaria'::text,
    'recepcionista'::text,
    'administrativo'::text,
    'superadmin'::text
  ]));

-- ── 6. Permissões: preserva o comportamento atual da Gi ──────────────────
-- Secretárias existentes continuam vendo o financeiro (como hoje).
UPDATE public.clinic_members
SET permissions = COALESCE(permissions, '{}'::jsonb)
  || '{"financeiro": true, "financeiro_clinica": true}'::jsonb
WHERE role = 'secretaria';

-- ── 7. GRANTs (evita os erros "permission denied" já vistos) ─────────────
GRANT ALL ON TABLE public.clinic_rooms  TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.agenda_shares TO postgres, anon, authenticated, service_role;
