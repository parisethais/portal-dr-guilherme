-- Adiciona campos de data da consulta e número da nota fiscal
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS consulta_date date;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS numero_nota text;
