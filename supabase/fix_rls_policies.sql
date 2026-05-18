-- ══════════════════════════════════════════════════════════════════════════
-- FIX: Simplifica RLS policies do multi-tenant
-- Problema: FOR ALL + FOR SELECT criava ambiguidade no Supabase
-- Solução: uma policy clara por operação, superadmin embutido em todas
-- ══════════════════════════════════════════════════════════════════════════

-- ── clinics ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "clinics_select"         ON clinics;
DROP POLICY IF EXISTS "clinics_all_superadmin" ON clinics;

-- Superadmin vê tudo; membro vê a própria clínica
CREATE POLICY "clinics_select" ON clinics FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR
  EXISTS (SELECT 1 FROM clinic_members WHERE clinic_id = clinics.id AND user_id = auth.uid())
);

-- Superadmin pode inserir, atualizar e deletar
CREATE POLICY "clinics_insert" ON clinics FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "clinics_update" ON clinics FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "clinics_delete" ON clinics FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- ── clinic_members ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "clinic_members_select"          ON clinic_members;
DROP POLICY IF EXISTS "clinic_members_all_superadmin"  ON clinic_members;

CREATE POLICY "clinic_members_select" ON clinic_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1 FROM clinic_members cm2
    WHERE cm2.clinic_id = clinic_members.clinic_id AND cm2.user_id = auth.uid()
  )
);

CREATE POLICY "clinic_members_insert" ON clinic_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "clinic_members_delete" ON clinic_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- ── clinic_settings ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "clinic_settings_select"          ON clinic_settings;
DROP POLICY IF EXISTS "clinic_settings_all_superadmin"  ON clinic_settings;
DROP POLICY IF EXISTS "clinic_settings_medico_update"   ON clinic_settings;

CREATE POLICY "clinic_settings_select" ON clinic_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1 FROM clinic_members
    WHERE clinic_id = clinic_settings.clinic_id AND user_id = auth.uid()
  )
);

CREATE POLICY "clinic_settings_insert" ON clinic_settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1 FROM clinic_members
    WHERE clinic_id = clinic_settings.clinic_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'medico')
  )
);

CREATE POLICY "clinic_settings_update" ON clinic_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  OR EXISTS (
    SELECT 1 FROM clinic_members
    WHERE clinic_id = clinic_settings.clinic_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'medico')
  )
);

CREATE POLICY "clinic_settings_delete" ON clinic_settings FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);
