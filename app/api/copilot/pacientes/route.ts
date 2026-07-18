import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCopilotAuthorized, COPILOT_TENANT } from '@/lib/copilot-auth'

export async function GET(req: NextRequest) {
  if (!isCopilotAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, email, phone, cpf, lgpd_accepted, created_at')
    .eq('role', 'paciente')
    .eq('tenant_id', COPILOT_TENANT)
    .order('full_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    total: data.length,
    pacientes: data.map((p) => ({
      id:          p.id,
      nome:        p.full_name ?? '(sem nome)',
      email:       p.email,
      telefone:    p.phone,
      cpf:         p.cpf,
      lgpd_aceita: p.lgpd_accepted,
      cadastrado_em: p.created_at,
    })),
  })
}
