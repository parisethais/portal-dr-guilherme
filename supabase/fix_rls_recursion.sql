-- ============================================================
-- Migração: corrige permissões e recursão RLS em profiles
-- Execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- 1. Garante acesso ao schema public
grant usage on schema public to anon, authenticated;

-- 2. GRANTs nas tabelas (RLS ainda controla quais linhas cada um vê)
grant select, update                    on public.profiles         to authenticated;
grant select, insert, delete            on public.documents        to authenticated;
grant select, insert, update            on public.messages         to authenticated;
grant select, insert, update            on public.contact_requests to authenticated;

-- 3. Cria a função auxiliar que lê o role sem acionar RLS
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

grant execute on function public.get_my_role() to authenticated;

-- 4. Substitui a policy recursiva pela versão segura
drop policy if exists "Médico vê todos os perfis" on public.profiles;

create policy "Médico vê todos os perfis"
  on public.profiles for select
  using (public.get_my_role() = 'medico');
