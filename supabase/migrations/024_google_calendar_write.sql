-- Migration 024: suporte a escrita no Google Calendar

-- ID do evento Google na consulta (para poder atualizar/deletar)
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

-- Calendário preferido do médico para escrever consultas
ALTER TABLE public.google_tokens
  ADD COLUMN IF NOT EXISTS preferred_calendar_id TEXT;
