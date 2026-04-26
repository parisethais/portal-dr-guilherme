-- ============================================================
-- Portal Dr. Guilherme — Schema Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase
-- ============================================================

-- ─── Tabelas ─────────────────────────────────────────────────

create table public.profiles (
  id            uuid        references auth.users(id) on delete cascade primary key,
  role          text        not null check (role in ('paciente', 'medico')),
  full_name     text,
  cpf           text,
  phone         text,
  lgpd_accepted boolean     not null default false,
  lgpd_accepted_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.documents (
  id            uuid        primary key default gen_random_uuid(),
  patient_id    uuid        not null references public.profiles(id) on delete cascade,
  uploaded_by   uuid        not null references public.profiles(id),
  title         text        not null,
  description   text,
  file_url      text        not null,
  file_name     text        not null,
  file_type     text,
  created_at    timestamptz not null default now()
);

create table public.messages (
  id            uuid        primary key default gen_random_uuid(),
  sender_id     uuid        not null references public.profiles(id),
  recipient_id  uuid        not null references public.profiles(id),
  content       text        not null,
  read          boolean     not null default false,
  created_at    timestamptz not null default now()
);

create table public.contact_requests (
  id            uuid        primary key default gen_random_uuid(),
  patient_id    uuid        not null references public.profiles(id) on delete cascade,
  subject       text        not null,
  message       text        not null,
  status        text        not null default 'pendente'
                            check (status in ('pendente', 'em_andamento', 'resolvido')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Índices ─────────────────────────────────────────────────

create index idx_documents_patient_id  on public.documents(patient_id);
create index idx_messages_recipient_id on public.messages(recipient_id);
create index idx_messages_sender_id    on public.messages(sender_id);
create index idx_contact_requests_patient_id on public.contact_requests(patient_id);
create index idx_contact_requests_status     on public.contact_requests(status);

-- ─── Trigger: criar perfil ao cadastrar usuário ───────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'paciente'),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ─── Permissões de acesso às tabelas ─────────────────────────
-- RLS controla quais linhas; GRANT controla se o role chega à tabela.

grant usage on schema public to anon, authenticated;

grant select, update                    on public.profiles         to authenticated;
grant select, insert, delete            on public.documents        to authenticated;
grant select, insert, update            on public.messages         to authenticated;
grant select, insert, update            on public.contact_requests to authenticated;

-- ─── Função auxiliar de role (security definer para evitar recursão RLS) ──────
-- Executa como o dono da função (bypassa RLS) — usada apenas nas policies abaixo.

create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ─── RLS ─────────────────────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.documents        enable row level security;
alter table public.messages         enable row level security;
alter table public.contact_requests enable row level security;

-- profiles
create policy "Usuário vê próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

-- ATENÇÃO: a versão anterior fazia EXISTS (SELECT … FROM profiles) dentro de uma
-- policy da própria tabela profiles → recursão infinita no PostgreSQL.
-- A função get_my_role() (security definer) quebra o ciclo.
create policy "Médico vê todos os perfis"
  on public.profiles for select
  using (public.get_my_role() = 'medico');

create policy "Usuário atualiza próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- documents
create policy "Paciente vê próprios documentos"
  on public.documents for select
  using (patient_id = auth.uid());

create policy "Médico vê todos os documentos"
  on public.documents for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'medico'
    )
  );

create policy "Médico insere documentos"
  on public.documents for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'medico'
    )
  );

create policy "Médico remove documentos"
  on public.documents for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'medico'
    )
  );

-- messages
create policy "Usuário vê próprias mensagens"
  on public.messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Usuário envia mensagens"
  on public.messages for insert
  with check (sender_id = auth.uid());

create policy "Destinatário marca como lida"
  on public.messages for update
  using (recipient_id = auth.uid());

-- contact_requests
create policy "Paciente vê próprias solicitações"
  on public.contact_requests for select
  using (patient_id = auth.uid());

create policy "Paciente cria solicitação"
  on public.contact_requests for insert
  with check (patient_id = auth.uid());

create policy "Médico vê todas as solicitações"
  on public.contact_requests for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'medico'
    )
  );

create policy "Médico atualiza status da solicitação"
  on public.contact_requests for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'medico'
    )
  );

-- ─── Storage ─────────────────────────────────────────────────
-- Execute as linhas abaixo pelo painel Storage > Buckets, ou via SQL:

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760,  -- 10 MB
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create policy "Médico faz upload"
  on storage.objects for insert
  with check (
    bucket_id = 'documents' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'medico'
    )
  );

create policy "Usuário autenticado acessa documentos"
  on storage.objects for select
  using (
    bucket_id = 'documents' and
    auth.role() = 'authenticated'
  );

create policy "Médico remove arquivos"
  on storage.objects for delete
  using (
    bucket_id = 'documents' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'medico'
    )
  );

-- ─── Médico inicial (opcional) ────────────────────────────────
-- Após criar o usuário médico via Auth > Users no painel,
-- execute para definir o papel manualmente (caso o metadata
-- não seja aplicado pelo trigger):
--
-- update public.profiles
-- set role = 'medico', full_name = 'Dr. Guilherme'
-- where id = '<uuid-do-usuario-medico>';
