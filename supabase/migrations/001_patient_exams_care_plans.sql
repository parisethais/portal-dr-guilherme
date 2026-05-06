-- ============================================================
-- Migration 001 — Exames do Paciente + Plano de Cuidados
-- Execute no SQL Editor do projeto Supabase
-- ============================================================

-- ─── Tabelas ─────────────────────────────────────────────────

create table public.patient_exams (
  id          uuid        primary key default gen_random_uuid(),
  patient_id  uuid        not null references public.profiles(id) on delete cascade,
  title       text        not null,
  file_url    text        not null,
  file_name   text        not null,
  file_type   text,
  file_size   integer,
  created_at  timestamptz not null default now()
);

create table public.care_plans (
  id          uuid        primary key default gen_random_uuid(),
  patient_id  uuid        not null references public.profiles(id) on delete cascade unique,
  content     text        not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid        not null references public.profiles(id)
);

-- ─── Índices ─────────────────────────────────────────────────

create index idx_patient_exams_patient_id on public.patient_exams(patient_id);
create index idx_care_plans_patient_id    on public.care_plans(patient_id);

-- ─── Permissões ──────────────────────────────────────────────

grant select, insert, delete on public.patient_exams to authenticated;
grant select, insert, update on public.care_plans    to authenticated;

-- ─── RLS ─────────────────────────────────────────────────────

alter table public.patient_exams enable row level security;
alter table public.care_plans    enable row level security;

-- patient_exams: paciente gerencia os próprios; médico vê todos
create policy "Paciente vê próprios exames"
  on public.patient_exams for select
  using (patient_id = auth.uid());

create policy "Paciente insere próprio exame"
  on public.patient_exams for insert
  with check (patient_id = auth.uid());

create policy "Paciente remove próprio exame"
  on public.patient_exams for delete
  using (patient_id = auth.uid());

create policy "Médico vê todos os exames"
  on public.patient_exams for select
  using (public.get_my_role() = 'medico');

-- care_plans: paciente apenas lê; médico cria/edita
create policy "Paciente vê próprio plano de cuidados"
  on public.care_plans for select
  using (patient_id = auth.uid());

create policy "Médico vê todos os planos de cuidados"
  on public.care_plans for select
  using (public.get_my_role() = 'medico');

create policy "Médico insere plano de cuidados"
  on public.care_plans for insert
  with check (public.get_my_role() = 'medico');

create policy "Médico atualiza plano de cuidados"
  on public.care_plans for update
  using (public.get_my_role() = 'medico');

-- ─── Storage: bucket exames ───────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exames',
  'exames',
  false,
  10485760,  -- 10 MB
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp'
  ]
)
on conflict (id) do nothing;

create policy "Paciente faz upload de exame"
  on storage.objects for insert
  with check (
    bucket_id = 'exames' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Usuário autenticado acessa exames"
  on storage.objects for select
  using (
    bucket_id = 'exames' and
    auth.role() = 'authenticated'
  );

create policy "Paciente remove próprio exame do storage"
  on storage.objects for delete
  using (
    bucket_id = 'exames' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
