-- Migration 035 — Permite secretaria gerenciar notas fiscais
-- Execute no SQL Editor do Supabase

-- Tabela: secretaria pode ver, inserir e excluir notas fiscais
create policy "Secretaria vê todas as notas fiscais"
  on public.invoices for select
  using (public.get_my_role() = 'secretaria');

create policy "Secretaria insere nota fiscal"
  on public.invoices for insert
  with check (public.get_my_role() = 'secretaria');

create policy "Secretaria remove nota fiscal"
  on public.invoices for delete
  using (public.get_my_role() = 'secretaria');

-- Storage: secretaria pode fazer upload e excluir arquivos do bucket invoices
create policy "Secretaria faz upload de nota fiscal"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'secretaria'
    )
  );

create policy "Secretaria remove nota fiscal do storage"
  on storage.objects for delete
  using (
    bucket_id = 'invoices' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'secretaria'
    )
  );
