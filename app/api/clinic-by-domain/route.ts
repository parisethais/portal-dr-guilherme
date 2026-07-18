import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

/**
 * GET /api/clinic-by-domain?host=santa-catharina.meden.health
 * Retorna o nome da clínica associada ao domínio.
 * Usado pelo LoginSplit para mostrar o branding correto na tela de login.
 */
export async function GET(request: NextRequest) {
  const host = request.nextUrl.searchParams.get('host')
  if (!host) return NextResponse.json({ name: null })

  const admin = createAdminClient()

  // Busca clinic_settings onde key='dominio' e value=host
  const { data: setting } = await admin
    .from('clinic_settings')
    .select('clinic_id')
    .eq('key', 'dominio')
    .eq('value', host)
    .maybeSingle()

  if (!setting?.clinic_id) return NextResponse.json({ name: null })

  // Nome de exibição (nome_exibicao ou fallback clinics.name) + rótulo do login
  const [{ data: nameSetting }, { data: labelSetting }, { data: clinic }] = await Promise.all([
    admin.from('clinic_settings')
      .select('value')
      .eq('clinic_id', setting.clinic_id)
      .eq('key', 'nome_exibicao')
      .maybeSingle(),
    admin.from('clinic_settings')
      .select('value')
      .eq('clinic_id', setting.clinic_id)
      .eq('key', 'login_label')
      .maybeSingle(),
    admin.from('clinics')
      .select('name')
      .eq('id', setting.clinic_id)
      .single(),
  ])

  const name  = nameSetting?.value || clinic?.name || null
  const label = labelSetting?.value || 'Consultório'
  return NextResponse.json({ name, label })
}
