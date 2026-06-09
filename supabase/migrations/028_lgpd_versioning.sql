-- Migration 028 — Versionamento do aceite LGPD + consentimento IA
-- Conformidade: LGPD Art. 8º (consentimento informado e específico)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lgpd_version      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lgpd_ai_consent   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lgpd_ai_consent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.lgpd_version IS
  'Versão da política aceita pelo paciente (ex: "2025-06-01")';
COMMENT ON COLUMN public.profiles.lgpd_ai_consent IS
  'Consentimento específico para uso de IA (Anthropic) no processamento de dados clínicos';
COMMENT ON COLUMN public.profiles.lgpd_ai_consent_at IS
  'Data/hora do consentimento para uso de IA';
