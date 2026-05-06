-- ============================================================
-- Migration 002 — Anexos do Plano de Cuidados
-- Execute no SQL Editor do projeto Supabase
-- ============================================================

create table public.care_plan_attachments (
  id          uuid        primary key default gen_random_uuid(),
  patient_id  uuid        not null references public.profiles(id) on delete cascade,
  title       text        not null,
  file_url    text        not null,
  file_name   text        not null,
  file_type   text,
  file_size   integer,
  uploaded_by uuid        not null references public.profiles(id),
  created_at  timestamptz not null default now()
);

create index idx_care_plan_attachments_patient_id on public.care_plan_attachments(patient_id);

grant select, insert, delete on public.care_plan_attachments to authenticated;

alter table public.care_plan_attachments enable row level security;

create policy "Paciente vê próprios anexos do plano"
  on public.care_plan_attachments for select
  using (patient_id = auth.uid());

create policy "Médico vê todos os anexos do plano"
  on public.care_plan_attachments for select
  using (public.get_my_role() = 'medico');

create policy "Médico insere anexo do plano"
  on public.care_plan_attachments for insert
  with check (public.get_my_role() = 'medico');

create policy "Médico remove anexo do plano"
  on public.care_plan_attachments for delete
  using (public.get_my_role() = 'medico');

-- ─── Storage: bucket care-attachments ────────────────────────
-- Limite de 100 MB para suportar vídeos curtos

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'care-attachments',
  'care-attachments',
  false,
  104857600,  -- 100 MB
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/mpeg'
  ]
)
on conflict (id) do nothing;

create policy "Médico faz upload de anexo do plano"
  on storage.objects for insert
  with check (
    bucket_id = 'care-attachments' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'medico'
    )
  );

create policy "Usuário autenticado acessa anexos do plano"
  on storage.objects for select
  using (
    bucket_id = 'care-attachments' and
    auth.role() = 'authenticated'
  );

create policy "Médico remove anexo do plano do storage"
  on storage.objects for delete
  using (
    bucket_id = 'care-attachments' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'medico'
    )
  );
