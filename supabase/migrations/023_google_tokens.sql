-- Migration 023: armazena tokens OAuth do Google Calendar por médico

CREATE TABLE IF NOT EXISTS public.google_tokens (
  user_id       UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_token  TEXT,
  refresh_token TEXT        NOT NULL,
  token_expiry  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- Cada usuário só acessa seus próprios tokens
CREATE POLICY "own_google_tokens"
  ON public.google_tokens FOR ALL
  USING (user_id = auth.uid());
