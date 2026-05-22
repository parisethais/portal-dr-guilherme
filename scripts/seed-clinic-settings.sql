-- Popula clinic_settings para o consultório Dr. Guilherme Santa Catharina
-- Execute no Supabase SQL Editor (requer service role / painel admin)
-- Idempotente: usa ON CONFLICT DO UPDATE

DO $$
DECLARE
  v_clinic_id uuid;
BEGIN
  SELECT id INTO v_clinic_id
  FROM clinics
  WHERE active = true
  LIMIT 1;

  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma clínica ativa encontrada';
  END IF;

  INSERT INTO clinic_settings (clinic_id, key, value)
  VALUES
    (v_clinic_id, 'especialidade', 'Nefrologia e Medicina Interna'),
    (v_clinic_id, 'crm_medico',   'CRM SP 170281'),
    (v_clinic_id, 'telefone',     '+55 11 93454-4550'),
    (v_clinic_id, 'email_contato', 'guilherme@santacatharina.com.br'),
    (v_clinic_id, 'endereco',     'Rua Barata Ribeiro, 190 · Cj 32/33 · Cerqueira César · São Paulo, SP')
  ON CONFLICT (clinic_id, key) DO UPDATE
    SET value = EXCLUDED.value;

  RAISE NOTICE 'clinic_settings populado para clinic_id = %', v_clinic_id;
END $$;
