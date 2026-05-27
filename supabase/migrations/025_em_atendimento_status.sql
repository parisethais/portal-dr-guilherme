-- Adiciona o status 'em_atendimento' ao enum de consulta
ALTER TYPE consulta_status ADD VALUE IF NOT EXISTS 'em_atendimento';
