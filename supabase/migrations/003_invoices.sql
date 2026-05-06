-- ============================================================
-- Migration 003 — Notas Fiscais (Invoices)
-- Execute no SQL Editor do projeto Supabase
-- ============================================================

create table public.invoices (
  id              uuid          primary key default gen_random_uuid(),
  patient_id      uuid          not null references public.profiles(id) on delete cascade,
  file_path       text          not null,   -- path dentro do bucket 'invoices'
  amount          numeric(10,2) not null,
  issue_date      date          not null,
  downloaded_at   timestamptz,              -- null = pendente
  created_at      timestamptz   not null default now()
);

create index idx_invoices_patient_id on public.invoices(patient_id);

grant select, insert, update, delete on public.invoices to authenticated;

alter table public.invoices enable row level security;

create policy "Paciente vê próprias notas fiscais"
  on public.invoices for select
  using (patient_id = auth.uid());

create policy "Paciente atualiza downloaded_at"
  on public.invoices for update
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "Médico vê todas as notas fiscais"
  on public.invoices for select
  using (public.get_my_role() = 'medico');

create policy "Médico insere nota fiscal"
  on public.invoices for insert
  with check (public.get_my_role() = 'medico');

create policy "Médico remove nota fiscal"
  on public.invoices for delete
  using (public.get_my_role() = 'medico');

-- ─── Storage: bucket invoices ─────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invoices',
  'invoices',
  false,
  10485760,  -- 10 MB
  array['application/pdf']
)
on conflict (id) do nothing;

create policy "Médico faz upload de nota fiscal"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'medico'
    )
  );

create policy "Usuário autenticado acessa notas fiscais"
  on storage.objects for select
  using (
    bucket_id = 'invoices' and
    auth.role() = 'authenticated'
  );

create policy "Médico remove nota fiscal do storage"
  on storage.objects for delete
  using (
    bucket_id = 'invoices' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'medico'
    )
  );
