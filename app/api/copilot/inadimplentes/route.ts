import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCopilotAuthorized, COPILOT_TENANT } from '@/lib/copilot-auth'

export async function GET(req: NextRequest) {
  if (!isCopilotAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('invoices')
    .select('id, amount, issue_date, downloaded_at, patient:profiles!patient_id(full_name, phone, email)')
    .eq('tenant_id', COPILOT_TENANT)
    .is('downloaded_at', null)
    .order('issue_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    total: data.length,
    inadimplentes: data.map((inv) => {
      const patient = inv.patient as { full_name?: string; phone?: string; email?: string } | null
      return {
        invoice_id:  inv.id,
        paciente:    patient?.full_name ?? '(sem nome)',
        telefone:    patient?.phone,
        email:       patient?.email,
        valor:       inv.amount,
        vencimento:  inv.issue_date,
      }
    }),
  })
}
