-- Migration 034 — Tipos de NF: consulta e internação
-- Execute no SQL Editor do Supabase

alter table public.invoices
  add column if not exists tipo              text not null default 'consulta'
    check (tipo in ('consulta', 'internacao')),
  add column if not exists internacao_inicio date,
  add column if not exists internacao_fim    date,
  add column if not exists internacao_dias   integer,
  add column if not exists internacao_local  text;
